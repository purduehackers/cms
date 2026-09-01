# Purdue Hackers CMS

Payload 3 admin CMS, deployed on Vercel, backed by Turso (libSQL) and Vercel Blob.

## Stack

- Payload 3.83 + Next.js 16 (App Router)
- Turso (libSQL) via `@payloadcms/db-sqlite`
- Vercel Blob for media uploads
- Resend for outbound email (wrapped with Sentry error capture)
- Sentry for error + performance monitoring
- Plugins: MCP, Redirects, Search, SEO, Sentry

## Collections

- `Users` — admins with local-strategy auth + optional API keys
- `ServiceAccounts` — API-key-only accounts for bots/integrations
- `Media` — Vercel Blob-backed uploads
- `Events`, `Rsvps`, `Emails` — events + email blasts
- `HackNightSessions` — hack night content
- `ShelterProjects`, `Ugrants` — public-facing project showcases

## Local development

```sh
bun install
cp .env.example .env   # fill in secrets
bun run dev
```

For local dev against a file-backed SQLite, set `TURSO_DATABASE_URL=file:./dev.db` and leave `TURSO_AUTH_TOKEN` empty.

## Environment variables

See `.env.example`. Required for production:

| Variable                 | Purpose                                            |
| ------------------------ | -------------------------------------------------- |
| `PAYLOAD_SECRET`         | Payload JWT/session signing                        |
| `TURSO_DATABASE_URL`     | `libsql://…turso.io` connection URL                |
| `TURSO_AUTH_TOKEN`       | Turso DB auth token                                |
| `BLOB_READ_WRITE_TOKEN`  | Vercel Blob token (auto-set on Vercel)             |
| `CLOUDFLARE_API_TOKEN`   | Cloudflare token; needs Account:Email Sending:Edit |
| `CLOUDFLARE_ACCOUNT_ID`  | Cloudflare account the sending domain lives in     |
| `SENTRY_DSN`             | Server-side Sentry DSN                             |
| `NEXT_PUBLIC_SENTRY_DSN` | Client-side Sentry DSN                             |
| `SENTRY_AUTH_TOKEN`      | Source-map upload token (Vercel CI only)           |

## Database

### Provisioning Turso

```sh
turso db create purdue-hackers-cms
turso db show purdue-hackers-cms --url
turso db tokens create purdue-hackers-cms
```

Add `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` to Vercel env (`vercel env add`).

### Migrations

- Generate a new migration: `bun run migrate:create <name>`
- Apply migrations: `bun run migrate`
- The initial baseline lives at `src/migrations/20260421_050103_initial.ts`.

The build runs migrations via the `ci` script: `payload migrate && bun run build`. Set Vercel's build command to `bun run ci`.

## Deploy

```sh
vercel link
vercel env pull .env
vercel deploy --prod
```

## Notes

- `strictNullChecks` is off to keep the ported hook code compiling. Treat nullable fields defensively in new code.
- The MCP plugin registers a `payload-mcp-api-keys` auth collection automatically — role-based access helpers in `src/collections/auth-utils.ts` ignore non-role-bearing user types.
