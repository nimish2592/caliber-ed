# Caliber Higher Ed

Standalone career-readiness / CV assessment SaaS for colleges, universities, career centres, and education fairs.

This is **not** a fork of Caliber ATS. It is a separate Next.js app with its own database, auth, storage, and deployment. Caliber hiring stays in `ats-perfect-ventures`.

## V1 product

Student: landing → upload CV → assessment → score, section scores, strengths, recommendations.

Institution: login → aggregate dashboard → events (link + QR) → settings and annual assessment limits.

Scoring lives in `src/lib/assessment/` and is **swappable**. V1 ships a documented heuristic engine. Set `ASSESSMENT_ENGINE=openai` later without changing the product shell.

## Local development

```bash
cd caliber-higher-ed
cp .env.example .env.local
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Scores and metadata live in **this project’s Supabase Postgres**. CV files go in a **private Supabase bucket** (`cv-uploads`), grouped by campus. Do not use Caliber hiring’s database or Drive. Local PGlite (`.data/pglite`) is only used when `DATABASE_URL` and `SUPABASE_DB_PASSWORD` are both unset.

- Staff upload (signed in): `{institution-slug}/login/{email}/{assessment-id}/{filename}`
- Student upload (public goal link): `{institution-slug}/goal/{goal-slug}/{assessment-id}/{filename}`

Demo campus login:

- Email: `campus@demo.edu`
- Password: `campus-demo`
- Seeded event: [/e/career-fair-2026](http://localhost:3000/e/career-fair-2026)

## Environment

See `.env.example`. Production needs a **new** Postgres database, `AUTH_SECRET`, storage bucket, and Vercel project. Do not copy Caliber secrets.

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Dedicated Higher-Ed Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Dedicated project anon / publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only service role (never expose to the browser) |
| `SUPABASE_DB_PASSWORD` | Dedicated project database password |
| `DATABASE_URL` | This project's Postgres URI. Direct `db.[ref].supabase.co` (IPv6) or Session pooler (IPv4/Vercel). |
| `STORAGE_DRIVER` | `supabase` (default) or `local` |
| `STORAGE_BUCKET` | Private bucket name (`cv-uploads`) |
| `AUTH_SECRET` | Institution session JWT |
| `ASSESSMENT_ENGINE` | `heuristic` (default) or `openai` |
| `OPENAI_API_KEY` | Only if using the OpenAI engine |
| `CALIBER_CV_API_URL` / `CALIBER_CV_API_KEY` | Reserved for a future extract-only Caliber API |

## Scoring

Default profile (`Higher Education Default`):

| Dimension | Weight |
|---|---|
| Education | 15 |
| Skills | 15 |
| Experience | 10 |
| Internships | 10 |
| Projects | 20 |
| Achievements | 15 |
| Certifications | 5 |
| Formatting | 5 |
| Completeness | 5 |

Status bands: 80–100 Strong, 65–79 Good, 50–64 Developing, 0–49 Needs improvement.

Replace `src/lib/assessment/heuristic.ts` or switch `ASSESSMENT_ENGINE` to change ranking without rewriting UI, tenancy, or events.

## Deploy

Create a **new** Vercel project from this repo (not the Caliber ATS project). Point it at a dedicated Postgres database and storage bucket.
