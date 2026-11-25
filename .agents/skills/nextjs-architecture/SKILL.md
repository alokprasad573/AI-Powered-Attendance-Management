---
name: nextjs-architecture
description: Guides implementation and review of Next.js App Router architecture, routing, layouts, Server and Client Components, data access, caching, and server boundaries for Haziri.AI.
---

# Next.js Architecture

## When to use

Use when creating routes, layouts, loading/error boundaries, Server Actions, Route Handlers, server/client component boundaries, or reorganizing the Next.js application.

## Project context

- Follow `PRD.md`, `ARCHITECTURE.md`, and `DATABASE.md`.
- Use Next.js App Router and TypeScript strict mode.
- Keep the existing Streamlit application available during migration.
- Do not add a standalone Express/FastAPI service without an approved architecture decision.

## Procedure

1. Inspect the installed Next.js version and existing project conventions. Verify version-specific APIs against official documentation before using them.
2. Map the feature to a route segment and define its loading, error, empty, and unauthorized states.
3. Default to Server Components. Add `"use client"` only for browser APIs, interactive state, event handlers, camera access, or client-only libraries.
4. Keep secrets, privileged Supabase clients, and authorization checks in server-only modules.
5. Keep domain services independent from route components. Avoid importing server-only modules into client bundles.
6. Use Route Handlers for HTTP endpoints and Server Actions for mutations tightly coupled to the app UI; do not implement the same operation twice.
7. Validate all mutation inputs at runtime. Re-check authorization inside the server operation even when middleware protects the route.
8. Choose caching/revalidation deliberately. Do not cache user-specific or sensitive attendance data publicly.
9. Add `loading.tsx`, `error.tsx`, `not-found.tsx`, or Suspense boundaries where they improve recovery and perceived performance.
10. Verify navigation, direct URL access, refresh, and role-based behavior.

## Design rules

- Keep route files thin; delegate business logic to typed services.
- Avoid giant client components and unnecessary global state.
- Do not use middleware as the only authorization layer.
- Do not expose secrets through `NEXT_PUBLIC_*`.
- Avoid dynamic rendering or cache overrides without a concrete requirement.
- Use explicit error handling; never turn failed writes into success UI.

## Verification

Run the repository's lint, type-check, test, and build scripts. Add tests for route access and server-side authorization. Record any caching assumptions and runtime constraints.
