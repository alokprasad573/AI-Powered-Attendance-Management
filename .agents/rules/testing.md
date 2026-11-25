---
trigger: always_on
description: Defines minimum testing, regression, privacy, and release-verification expectations for Haziri.AI.
---

# Testing Rules

- Derive tests from PRD acceptance criteria and the affected domain contract.
- Add unit tests for deterministic business logic, integration tests for Supabase/server boundaries, and Playwright E2E tests for critical user journeys.
- Test both success and failure paths, including malformed input, unauthenticated access, wrong roles, cross-user access, network failure, retries, and concurrency where relevant.
- For attendance, cover multiple sessions, duplicate submissions, multiple photos/faces, unknown faces, manual corrections, discard, and explicit confirmation.
- For AI, use synthetic or explicitly approved/consented fixtures. Never use production student biometric data in tests.
- Mock browser camera and model inference for deterministic UI tests; separately validate real model/runtime integration in a controlled environment.
- Test RLS with multiple teacher and student identities; a successful UI test does not prove database isolation.
- Avoid arbitrary sleeps and brittle selectors in browser tests.
- Do not skip or weaken failing tests without documenting the reason and impact.
- Run and report actual lint, type-check, unit, integration, E2E, and production-build results applicable to the change.
- Do not claim a feature is complete or release-ready while critical acceptance criteria or security tests remain unverified.
