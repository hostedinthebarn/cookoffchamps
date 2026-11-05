export interface Env {
  DB: D1Database;
  PHOTOS: R2Bucket;
  ASSETS: Fetcher;
  /** "log" keeps emails in the dev outbox; "resend" sends through Resend. */
  EMAIL_MODE: "log" | "resend";
  /** Where links in emails point, e.g. https://cookoffchamps.com */
  APP_ORIGIN: string;
  /** The sending address, on a domain verified in Resend. */
  EMAIL_FROM: string;
  /** Set with `wrangler secret put RESEND_API_KEY`; absent in local dev. */
  RESEND_API_KEY?: string;
  TURNSTILE_SITE_KEY: string;
  TURNSTILE_SECRET: string;
  /** Set with `wrangler secret put IP_HASH_KEY`: the key for the IP-address hashes. */
  IP_HASH_KEY: string;
  /**
   * "on" while pro events are a free preview (SW-25): anyone can create one.
   * Anything else and Pro shows as coming soon. Production stays "off" until
   * pro events are finished; payments (SW-26) replace the preview later.
   */
  PRO_PREVIEW?: string;
}
