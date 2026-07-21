# Typing Skills

A typing-practice and speed-test web app for institute students, with admin-managed
tasks, batches, targets, and a leaderboard. Built with Next.js (App Router) and
Supabase (Postgres), with custom JWT-based session auth.

## Stack

- **Framework:** Next.js 16 (App Router, Turbopack), served via a custom
  `server.js` (Phusion Passenger / cPanel deployment target — see
  `.github/workflows/cpanel-deploy.yml`)
- **Database:** Supabase (Postgres), accessed server-side with the service
  role key (RLS is bypassed intentionally — the app enforces authorization
  itself via its own JWT sessions, see `src/lib/auth.ts`)
- **Auth:** Custom email/password auth with bcrypt password hashing and
  signed JWTs stored in an `httpOnly` cookie (not Supabase Auth)
- **UI:** React 19, Tailwind CSS 4

## Getting started

1. Copy `.env.example` to `.env` and fill in:
   - `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` — from your
     Supabase project's API settings
   - `JWT_SECRET` — a long random value (`openssl rand -base64 48`). The app
     will refuse to start without this set.
   - `SMTP_*` — optional, only needed for the forgot-password email. Without
     these set, forgot-password requests still succeed (to avoid leaking
     which emails are registered) but no email actually goes out; check the
     server log for a clear warning if that happens.
2. Run `scripts/sql/2026-07-21-add-password-reset-columns.sql` once against
   your Supabase project (SQL editor) — the forgot-password flow needs the
   `reset_token`/`reset_token_expires_at` columns it adds to `users`.
3. Install dependencies and run the dev server:

   ```bash
   npm install
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start the Next.js dev server |
| `npm run build` | Production build |
| `npm run start` | Run the production build (`server.js`) |
| `npm run lint` | ESLint |

`scripts/migrate-to-supabase.js` is a one-off, idempotent script used for the
original Firebase → Supabase data migration (see `dependencies` note below).
It requires a Firebase service account (`firebase-key.json` or
`FIREBASE_SERVICE_ACCOUNT` env var) plus the Supabase env vars above, and can
be safely re-run — every collection is migrated with `upsert`.

## Notes

- `firebase-admin` and `dotenv` are devDependencies, not runtime dependencies —
  they're only used by the migration script above, not by the deployed app.
- Session authorization is enforced independently in every API route via
  `getUserFromRequest()` (`src/lib/auth.ts`), which verifies the JWT
  signature. `src/proxy.ts` only decodes the token (no signature check) to
  redirect page loads to the right place before render — it is not a
  security boundary on its own.
- Password reset (`src/app/api/auth/forgot-password`,
  `src/app/api/auth/reset-password`) stores a SHA-256 hash of a random token
  on the user row with a 1-hour expiry, and emails the raw token via
  `nodemailer` (see `src/lib/mail.ts`). Requires the SQL migration in
  `scripts/sql/` and the `SMTP_*` env vars above.
