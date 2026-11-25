---
name: supabase-development
description: Implements Supabase Auth, PostgreSQL data access, Storage, SSR session handling, and typed Supabase integration in the Haziri.AI Next.js application.
---

# Supabase Development

## When to use

Use for Supabase client setup, authentication, database queries, Storage operations, server-side sessions, and generated database types.

## Procedure

1. Read `DATABASE.md` and inspect the actual Supabase project schema and installed SDK versions.
2. Follow the current official Supabase Next.js SSR pattern for the installed package versions; do not copy outdated client setup snippets.
3. Keep separate browser and server clients. Use the server client for trusted server operations and the browser client only for user-scoped operations.
4. Use the publishable/anon key in client-safe configuration as appropriate for the project's Supabase version. Keep the service-role/secret key server-only.
5. Generate TypeScript database types from the actual schema and use them in client factories and services.
6. Handle auth cookies/session refresh using the supported SSR integration. Do not manually invent cookie behavior.
7. Enforce authorization with RLS and server-side checks. Supabase Auth establishes identity; it does not automatically grant access to every row.
8. Use Storage policies and private buckets for non-public content. Generate short-lived signed URLs only when required.
9. Handle errors explicitly and avoid returning raw database internals to users.
10. Add integration tests for authenticated and unauthorized access.

## Haziri.AI migration constraints

- Existing bcrypt teacher credentials are not automatically valid Supabase Auth credentials. Follow an approved migration or password-reset strategy.
- Preserve existing teacher/student/subject/attendance relationships.
- Do not execute the context-only SQL in `DATABASE.md` as a migration.
- Do not persist face photos or embeddings to Storage without explicit approval, consent, retention, and access policies.
- Never expose service-role credentials or bypass RLS from browser code.

## Verification

Test sign-in, sign-out, refresh, expired sessions, role mismatch, cross-user data access, storage denial, and server/client environment separation. Document any schema assumption that could not be verified.
