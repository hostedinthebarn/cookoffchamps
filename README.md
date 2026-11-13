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
