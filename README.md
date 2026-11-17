# Cookoff Champs

[![CI](https://github.com/hostedinthebarn/cookoffchamps/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/hostedinthebarn/cookoffchamps/actions/workflows/ci.yml)

A small web app for friendly family cookoffs, at cookoffchamps.com.

An organizer creates an event, photographs each dish and prints a QR poster. Guests scan the code and vote for their favourite dish without knowing who cooked it. When voting closes, a reveal screen shows 3rd, 2nd and then 1st place, one click at a time.

## Stack

It runs entirely on Cloudflare's free tier:

- **Workers:** the API, plus static assets for the frontend
- **D1:** events, entries and votes
- **R2:** photos
- **Turnstile:** keeps scripted votes out

Login emails go through [Resend](https://resend.com)'s free plan. (Cloudflare Email Sending needs the paid Workers plan.)

## Development

```sh
npm install
npm run db:migrate:local
npm run dev        # http://localhost:8787
```

Copy `.dev.vars.example` to `.dev.vars` first. In production, the IP-address hashes are keyed with a secret: `npx wrangler secret put IP_HASH_KEY` (a long random string). Without it, login and code lookups fail rather than store weak hashes.

In development, magic-link emails are kept in a dev outbox instead of sent (`EMAIL_MODE=log`): open http://localhost:8787/api/dev/outbox to see them.

## Run your own

You can run your own copy on your own Cloudflare account. Everything fits Cloudflare's free plan apart from the domain.

**You need:**

- a Cloudflare account, with a domain on it (the app serves one origin, and login emails come from that domain);
- a free [Resend](https://resend.com) account with that domain verified. Hosts sign in with a link sent by email, so a deployed copy can't work without it. The dev outbox only works on `localhost`;
- Node.js 22, and Wrangler logged in to your account (`npx wrangler login`).

**1. Create the database and the photo bucket**

```sh
npx wrangler d1 create cookoffchamps            # prints a database_id
npx wrangler r2 bucket create cookoffchamps-photos
```

**2. Point `wrangler.jsonc` at your own account and domain**

- `d1_databases[0].database_id`: the id printed above;
- `routes`: your domain (and its `www.`, which the app redirects to the bare domain);
- `vars.APP_ORIGIN`: `https://` plus your domain. Login links point here, and the Turnstile check compares against its hostname;
- `vars.EMAIL_FROM`: an address on your Resend-verified domain;
- `vars.TURNSTILE_SITE_KEY`: the site key of a [Turnstile](https://developers.cloudflare.com/turnstile/) widget you create for your domain;
- `vars.PRO_PREVIEW`: `"off"` hides the judged "Pro" events, which are still a preview.

If you rename the database or bucket, change their names here and in the commands below.

**3. Create the tables**

```sh
npx wrangler d1 migrations apply cookoffchamps --remote
```

**4. Set the three secrets.** Wrangler prompts for each value, so none is typed into a file or your shell history:

```sh
npx wrangler secret put IP_HASH_KEY        # any long random string; the app refuses logins without it
npx wrangler secret put TURNSTILE_SECRET   # your Turnstile widget's secret key
npx wrangler secret put RESEND_API_KEY     # a Resend API key with sending access
```

**5. Deploy**

```sh
npm install
npm run deploy
```

`npm run deploy` builds the site, runs `scripts/check-publish.mjs` (only web file types are published, and nothing that looks like a secret), then runs `wrangler deploy`, which attaches your domain. Open `https://<your domain>/api/health` to check it's up, then create a test event.

**Running costs:** on Cloudflare's free plan, the limits that matter are R2 storage (10 GB, which is a lot of dish photos) and D1's daily row reads and writes, far above what a family cookoff uses. A cron runs every 10 minutes to delete scrambled IP addresses after the times the privacy page states. Resend's free plan covers the login emails. ⚠️ Check Cloudflare's and Resend's current pricing pages, as free-tier limits change.

**Branding:** the code is MIT, but the Cookoff Champs name and logo aren't covered by the licence (see below). If you run a public copy, give it your own name.

## Tests

```sh
npm test
npm run coverage   # fails below 100% lines, branches, functions or statements
```

API tests run inside the Workers runtime against local D1 and R2, through `@cloudflare/vitest-plugin`. Coverage is measured with istanbul and must stay at 100%. CI enforces this on every push and pull request. If any code is excluded from coverage, the comment that excludes it must say why.

## Contributing

Changes reach `main` only through a pull request, and CI must pass before it merges. CodeRabbit reviews pull requests into `main` once they're out of draft. It skips generated files (`package-lock.json`, the built `public/app.js` and its source map, and the printable PDFs); the settings are in `.coderabbit.yaml`.

## License

The code is MIT licensed. The Cookoff Champs name and logo aren't covered by the licence.

The production bundle includes third-party packages under their own MIT and ISC licences. `npm run build` writes their notices to `public/third-party-notices.txt`, which the site serves at `/third-party-notices.txt` and links from the footer of the help pages. The build fails if a production package has no licence text to include.
