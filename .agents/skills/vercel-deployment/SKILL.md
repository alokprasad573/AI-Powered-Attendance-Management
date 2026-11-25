---
name: vercel-deployment
description: Prepares, deploys, and verifies the Haziri.AI Next.js application on Vercel with safe environment configuration, previews, and rollback planning.
---

# Vercel Deployment

## When to use

Use when configuring Vercel, preparing preview/production deployments, debugging build/runtime failures, or planning a release.

## Procedure

1. Inspect the Next.js version, package scripts, lockfile, build output, and Vercel project settings.
2. Confirm required environment variable names and scopes (development, preview, production). Never request or print secret values in logs or documentation.
3. Keep Supabase service-role/secret keys server-only. Only explicitly safe values may use the `NEXT_PUBLIC_` prefix.
4. Verify build, lint, type-check, tests, and production build before deployment.
5. Deploy to a preview environment first.
6. Verify SSR/session refresh, auth redirects, database access, Storage policies, camera permissions, and AI model/WASM asset loading in preview.
7. Check runtime compatibility, function duration, payload size, caching, headers, and asset paths.
8. Verify observability and ensure logs exclude credentials and biometric data.
9. Document database migration ordering and rollback/forward-recovery steps.
10. Promote to production only after QA acceptance and explicit user approval.

## Haziri.AI constraints

- Keep the legacy Streamlit service available until the Next.js migration is accepted.
- Do not run production migrations, change DNS, or perform cutover without explicit approval.
- Do not put private model assets, secrets, or student data in public static assets.
- Validate browser model downloads and WASM paths from the deployed origin.

## Completion report

Provide deployment environment, commit/ref, build and test evidence, configured variable names (not values), preview verification, monitoring signals, and rollback plan. Never claim production deployment without a confirmed deployment result.
