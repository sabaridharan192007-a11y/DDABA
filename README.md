# DDABA — Dindigul District Aeroskatoball Association

Official district-level player & association management portal. A full-stack app with
role-based authentication, player profiles, discipline-scoped rankings, match registration
with admin-approved match registration, area/institution-based registration control, and an admin dashboard.

Affiliated with **ASBAT** (Aeroskatoball Association of Tamilnadu), the state governing body —
DDABA runs its own independent database, admins, and registration system at the district level.

## Overview

- Public visitors can search players, view profiles, browse news/announcements, and check
  discipline-scoped rankings.
- Players log in to see their own dashboard (stats, upcoming matches, "Recent Participation"),
  register for specific matches and track admin approval status.
- Admins manage players, matches (including per-match registration settings), match points
  (the ranking source of truth), registration approvals, and registration permissions.

## Features

- Session-based authentication with hashed + peppered passwords (scrypt), account lockout
  after repeated failed logins, session regeneration on login (fixation prevention)
- Role-based authorization enforced on the **server**, not just hidden in the UI
- CSRF protection (synchronizer token pattern), rate limiting, Helmet security headers with a
  strict CSP, HTTP Parameter Pollution protection
- Real PostgreSQL persistence via Drizzle ORM
- **Match registration with admin approval**: player fills a per-match form (name, age, category,
  father's name, representing institution, up to N disciplines, and optional birth certificate).
  The registration appears as Pending Approval until an admin accepts or rejects it.
- **Registration permissions**: admin controls registration eligibility per area (taluk), with
  optional club/school/college overrides. The most specific rule always wins — a
  club/school/college-specific entry overrides its area's general rule, in either direction.
- Player IDs are generated randomly and uniquely by the server during registration or admin
  player creation; clients cannot supply or edit them. Categories, disciplines, areas, and
  club/school/college names accept typed values with suggested options.
- Forgot-password OTPs are sent through SMTP when all SMTP settings are configured. If SMTP is
  not configured or delivery fails, the API reports that limitation instead of claiming an OTP
  was sent.
- **Discipline-scoped rankings**: points are entered per player, per match, per discipline —
  never a single mutable total. Rankings are always `SUM()` queries, filterable by discipline,
  year, area, and category. District-wide only (no state-level scope, since DDABA is a single
  district).
- Admin-configurable per-match registration settings: entry fee, max disciplines a participant
  may select (this varies year to year), and whether a birth certificate upload is required —
  plus an explicit Release/Close toggle so registration is hidden until the admin is ready.
- Soft-deletion (deactivate/reactivate) for players — no destructive deletes by default
- Audit logging on all sensitive admin actions (points awarded, registrations accepted, registration
  permissions changed, player status changes, document views)
- Loading states, empty states, and user-friendly error messages throughout
- Responsive layout (mobile hamburger nav, scrollable admin tables, stacked forms)

## Technology Stack

- **Frontend:** React + TypeScript, Vite, Tailwind CSS, Framer Motion, Lucide icons, Recharts,
  `qrcode.react` (UPI QR rendering)
- **Backend:** Node.js + Express, Multer (file uploads), PDFKit (receipt generation)
- **Database:** PostgreSQL
- **ORM:** Drizzle ORM (+ Drizzle Kit for migrations)
- **Security:** express-session + connect-pg-simple, Helmet, express-rate-limit, hpp, scrypt
  password hashing with an optional pepper, CSRF tokens, Zod validation everywhere

## Project Structure

```
client/             React frontend (Vite root)
  src/
    components/     Reusable UI (Navbar, ProtectedRoute, StatCard, ...)
    pages/          Route-level pages (public, player, admin/*)
    layouts/        PublicLayout, AdminLayout
    hooks/          useAuth
    lib/            api client, constants (categories/disciplines/areas)
server/             Express backend
  routes/           auth, players, matches, matchRegistrations, registrationPermissions,
                     announcements, news, achievements, points, misc
  middleware/       requireAuth / requireAdmin, security (helmet/rate-limit/hpp), csrf
  services/         password hashing and document storage
  storage.ts        data-access layer (Drizzle queries)
  db.ts, env.ts      DB connection, validated environment config
  index.ts          app entry point
shared/
  schema/schema.ts  Drizzle schema (single source of truth for tables/types)
database/
  seed/seed.ts      demo data + admin seed script
uploads/documents/  birth certificate uploads (git-ignored, never web-served directly)
```

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Required variables:

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `SESSION_SECRET` | Long random string signing session cookies (min 32 chars) |
| `PASSWORD_PEPPER` | Recommended in production — extra secret mixed into password hashes (min 16 chars) |
| `PORT` | Port for the Express server (default 5000) |
| `ALLOWED_ORIGINS` | Comma-separated origins allowed to call the API with credentials |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASSWORD` / `SMTP_FROM` | SMTP settings required for forgot-password OTP email |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | Admin account created by the seed script — password required, no default |
| `SEED_DEMO_PASSWORD` | Password for all demo player accounts |

Generate secrets:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### 3. Database setup

```bash
npm run db:push
```

### 4. Seed demo data + admin account

```bash
npm run db:seed
```

Creates: one `ADMIN` user, 12 demo players across Dindigul taluks, 5 demo matches (one with
registration released — try registering as a demo player), match points, registration
permission rules (including one institution-specific override), announcements, news, and
achievements.

Admin accounts are **only** created this way — there is no public admin sign-up.

### 5. Run locally

```bash
npm run dev
```

Runs the Express API (port 5000) and Vite dev server (port 5173, proxying `/api`) concurrently.
Open `http://localhost:5173`.

## Login

- **Admin:** `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`
- **Demo player:** e.g. `arun.kumar@demo.ddaba.local` / `SEED_DEMO_PASSWORD` (login also accepts
  a Player ID like `DDABA-1000` in place of email)

## Document Uploads

Birth certificate uploads (JPG/PNG/PDF, max 5MB) are stored in `uploads/documents/` on the
server's filesystem — **outside** anything Express serves statically. Files are renamed to a
random UUID on upload (the original filename is never trusted or stored), and the only way to
retrieve one is through an authenticated route that checks the requester is either the
registration's owner or an admin. Every document view is written to the audit log.

**Production note:** `uploads/` is git-ignored and stored on local disk by default — if you
deploy to an environment with an ephemeral filesystem (e.g. most PaaS free tiers), mount a
persistent volume at that path or switch `server/services/documents.ts` to an object storage
backend (S3-compatible), or uploaded documents will be lost on redeploy.

## Security Notes

- Passwords are hashed with scrypt + a random salt per user, optionally combined with a
  server-side pepper (`PASSWORD_PEPPER`) that never touches the database.
- Accounts lock for 15 minutes after 5 failed login attempts.
- Session IDs are regenerated on login/registration (prevents session fixation), CSRF tokens
  are required on every state-changing request, and cookies are `httpOnly`, `sameSite=strict`,
  and `secure` in production.
- User **role** is read only from the server-side session, never trusted from client input.
- All admin write endpoints (players, matches, points, registration permissions, registration
  verification, announcements, news, achievements) require `requireAdmin` server-side
  middleware, independent of what the frontend shows or hides.
- Login errors are intentionally generic so they don't reveal whether an email/Player ID is
  registered.
- Registration eligibility (both account sign-up and match entry) is checked server-side
  against the area/institution permission rules — not just hidden in the UI.
- Rate limiting: 10 login attempts / 15 min per IP, 5 registrations / hour per IP, 300 general
  API requests / 15 min per IP. The default rate-limit store is in-memory (per-process) — for a
  multi-instance production deployment, swap in a shared store (e.g. `rate-limit-redis`).
- `.env` and `uploads/` are git-ignored; never commit real secrets or uploaded documents.

## Known Limitations / Next Steps

- Registration approval is manual by design — admins accept or reject each player registration.
- No email delivery for password reset (UI-only in this version).
- Match registration currently supports one document type (birth certificate); extending to
  multiple document types would mean adding more columns/routes following the same pattern.
- Notifications are a simple list, not real-time (no WebSockets).
