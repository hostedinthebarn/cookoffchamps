import { env } from "cloudflare:workers";
import { afterEach, describe, expect, it, vi } from "vitest";
import { hashIp, safeNext, sha256 } from "../../src/worker/auth";
import { call, latestLink, login, send } from "./helpers";

afterEach(() => vi.restoreAllMocks());

describe("magic-link login", () => {
  it("emails a link that logs in once and lands on the next page", async () => {
    const res = await send("/api/auth/login", "POST", { email: " Gary@Example.com ", next: "/e/abc" });
    expect(await res.json()).toEqual({ ok: true });

    const link = new URL(await latestLink("gary@example.com"));
    expect(link.searchParams.get("next")).toBe("/e/abc");

    const verify = await call(link.pathname + link.search);
    expect(verify.status).toBe(302);
    expect(verify.headers.get("location")).toBe("/e/abc");
    const setCookie = verify.headers.get("set-cookie")!;
    expect(setCookie).toMatch(/^__Host-cc_session=.+; Path=\/; Max-Age=2592000; HttpOnly; Secure; SameSite=Lax$/);

    const me = await call("/api/me", { cookie: setCookie.split(";")[0] });
    expect(await me.json()).toEqual({ email: "gary@example.com" });

    // The same link a second time is refused.
    const again = await call(link.pathname + link.search);
    expect(again.headers.get("location")).toBe("/?login=expired");
    expect(again.headers.get("set-cookie")).toBeNull();
  });

  it("refuses an expired link", async () => {
    await send("/api/auth/login", "POST", { email: "late@example.com" });
    const link = new URL(await latestLink("late@example.com"));
    await env.DB.prepare("UPDATE login_tokens SET expires_at = '2000-01-01T00:00:00Z' WHERE email = ?")
      .bind("late@example.com")
      .run();
    const res = await call(link.pathname + link.search);
    expect(res.headers.get("location")).toBe("/?login=expired");
  });

  it("refuses a missing or made-up token", async () => {
    expect((await call("/api/auth/verify")).headers.get("location")).toBe("/?login=expired");
    expect((await call("/api/auth/verify?token=nope")).headers.get("location")).toBe("/?login=expired");
  });

  it("only stores hashes of tokens", async () => {
    await send("/api/auth/login", "POST", { email: "hash@example.com" });
    const token = new URL(await latestLink("hash@example.com")).searchParams.get("token")!;
    const row = await env.DB.prepare("SELECT token_hash FROM login_tokens WHERE email = ?").bind("hash@example.com").first<{ token_hash: string }>();
    expect(row!.token_hash).toBe(await sha256(token));
    expect(row!.token_hash).not.toContain(token);
  });

  it("rejects bad email addresses and bodies", async () => {
    expect((await send("/api/auth/login", "POST", { email: "not-an-email" })).status).toBe(400);
    expect((await send("/api/auth/login", "POST", {})).status).toBe(400);
    expect((await send("/api/auth/login", "POST", [1])).status).toBe(400);
    expect((await send("/api/auth/login", "POST", null)).status).toBe(400);
    const notJson = await call("/api/auth/login", { method: "POST", body: "{nope" });
    expect(notJson.status).toBe(400);
    expect(await notJson.json()).toEqual({ error: "Body must be JSON" });
  });

  it("ignores an off-site next", async () => {
    await send("/api/auth/login", "POST", { email: "next@example.com", next: "//evil.example" });
    const link = new URL(await latestLink("next@example.com"));
    expect(link.searchParams.get("next")).toBe("/");
    const res = await call(link.pathname + "?token=" + link.searchParams.get("token") + "&next=https://evil.example");
    expect(res.headers.get("location")).toBe("/");
  });
});

describe("sessions", () => {
  it("needs a session for /api/me", async () => {
    expect((await call("/api/me")).status).toBe(401);
    expect((await call("/api/me", { cookie: "__Host-cc_session=forged" })).status).toBe(401);
    expect((await call("/api/me", { cookie: "other=1" })).status).toBe(401);
  });

  it("logs out by deleting the session and clearing the cookie", async () => {
    const cookie = await login("out@example.com");
    const res = await call("/api/auth/logout", { method: "POST", cookie });
    expect(res.headers.get("set-cookie")).toContain("Max-Age=0");
    expect((await call("/api/me", { cookie })).status).toBe(401);
  });

  it("logs out without a session too", async () => {
    expect((await call("/api/auth/logout", { method: "POST" })).status).toBe(200);
  });

  it("expires sessions", async () => {
    const cookie = await login("old@example.com");
    await env.DB.prepare("UPDATE sessions SET expires_at = '2000-01-01T00:00:00Z' WHERE email = ?").bind("old@example.com").run();
    expect((await call("/api/me", { cookie })).status).toBe(401);
  });
});

describe("safeNext", () => {
  it("keeps same-site paths only", () => {
    expect(safeNext("/e/1")).toBe("/e/1");
    expect(safeNext(null)).toBe("/");
    expect(safeNext("https://x")).toBe("/");
    expect(safeNext("//x")).toBe("/");
  });
});

describe("email delivery", () => {
  const resend = { ...env, EMAIL_MODE: "resend" as const, RESEND_API_KEY: "re_test" };

  it("sends through Resend outside log mode", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ id: "m1" }));
    const { sendEmail } = await import("../../src/worker/email");
    await sendEmail(resend, { to: "a@b.co", subject: "Hi", text: "Body" });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://api.resend.com/emails");
    expect(new Headers(init!.headers).get("authorization")).toBe("Bearer re_test");
    expect(JSON.parse(init!.body as string)).toEqual({
      from: "Cookoff Champs <hello@cookoffchamps.com>",
      to: ["a@b.co"],
      subject: "Hi",
      text: "Body",
    });
  });

  it("reports a failed send as 502", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("domain not verified", { status: 403 }));
    const { sendEmail } = await import("../../src/worker/email");
    await expect(sendEmail(resend, { to: "a@b.co", subject: "Hi", text: "Body" })).rejects.toMatchObject({ status: 502 });
  });

  it("shows the dev outbox only on localhost in log mode", async () => {
    const { readOutbox } = await import("../../src/worker/email");
    await send("/api/auth/login", "POST", { email: "box@example.com" });
    const res = await call("/api/dev/outbox");
    expect(res.status).toBe(200);
    const mail = await res.json<{ to: string; subject: string }[]>();
    expect(mail[0]).toMatchObject({ to: "box@example.com", subject: "Your Cookoff Champs login link" });

    expect(await readOutbox({ ...env, APP_ORIGIN: "https://cookoffchamps.com" })).toBeNull();
    expect(await readOutbox({ ...env, EMAIL_MODE: "resend" })).toBeNull();
  });

  it("writes the login email in Spanish when the app asks in Spanish (SW-27)", async () => {
    await send("/api/auth/login", "POST", { email: "es@example.com", lang: "es" });
    await send("/api/auth/login", "POST", { email: "other@example.com", lang: "fr" }); // anything else is English
    const rows = await env.DB.prepare("SELECT to_addr, subject, body FROM dev_outbox WHERE to_addr IN (?, ?)")
      .bind("es@example.com", "other@example.com")
      .all<{ to_addr: string; subject: string; body: string }>();
    const by = Object.fromEntries(rows.results.map((r) => [r.to_addr, r]));
    expect(by["es@example.com"]!.subject).toBe("Tu enlace para entrar a Cookoff Champs");
    expect(by["es@example.com"]!.body).toMatch(/^Aquí está tu enlace[\s\S]*\/api\/auth\/verify\?token=[\s\S]*Si no lo pediste, ignora este correo\.$/);
    expect(by["other@example.com"]!.subject).toBe("Your Cookoff Champs login link");
  });

  it("hides the dev outbox route when it's off", async () => {
    const { default: worker } = await import("../../src/worker/index");
    const res = await worker.fetch(new Request("https://cookoffchamps.com/api/dev/outbox"), {
      ...env,
      APP_ORIGIN: "https://cookoffchamps.com",
    });
    expect(res.status).toBe(404);
  });
});

describe("IP hashing", () => {
  it("is a keyed HMAC-SHA-256: stable, not the bare SHA-256, and different under another key", async () => {
    const a = await hashIp(env, "203.0.113.9");
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(await hashIp(env, "203.0.113.9")).toBe(a);
    expect(a).not.toBe(await sha256("203.0.113.9"));
    expect(await hashIp({ ...env, IP_HASH_KEY: "another-key" }, "203.0.113.9")).not.toBe(a);
    expect(await hashIp(env, "203.0.113.10")).not.toBe(a);
  });

  it("refuses to hash without the key, so a deploy missing the secret fails loudly", async () => {
    await expect(hashIp({ ...env, IP_HASH_KEY: "" }, "203.0.113.9")).rejects.toThrow();
  });
});
