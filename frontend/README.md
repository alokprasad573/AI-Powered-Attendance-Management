# Haziri.AI Frontend (Next.js App Router)

Next.js App Router migration of Haziri.AI / SmartRoll. The legacy Python/Streamlit app in the repository root remains untouched during migration.

## Prerequisites

- Node.js 20+ (verified on Node v26.13.0)
- npm 10+

## Environment Setup

Copy `.env.local.example` to `.env.local` and configure values:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_SITE_URL` (e.g. `http://localhost:3000`)
- `SUPABASE_SERVICE_ROLE_KEY` (server-only, never `NEXT_PUBLIC_*`)

## Scripts

```bash
npm run dev         # Start development server with Turbopack
npm run lint        # Run ESLint across frontend/
npm run type-check  # Run TypeScript strict type-checking
npm run test        # Run Vitest unit and server-boundary tests
npm run build       # Build production Next.js bundle
npm run start       # Start production server
npm run test:e2e    # Run Playwright E2E suite
```
