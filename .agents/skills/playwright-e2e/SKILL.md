---
name: playwright-e2e
description: Creates reliable Playwright end-to-end tests for Haziri.AI authentication, teacher/student workflows, attendance, authorization, and responsive browser behavior.
---

# Playwright E2E Testing

## When to use

Use when adding or debugging browser-level tests, validating complete user journeys, or checking regressions before release.

## Procedure

1. Inspect the current Playwright configuration, scripts, base URL, and test conventions.
2. Use isolated test accounts and deterministic seeded data; never use production credentials or student biometric data.
3. Prefer role, label, and accessible-name locators over brittle CSS selectors.
4. Keep tests independent and clean up created data safely.
5. Cover both happy paths and important failures.
6. Mock camera/media and model outputs at the browser boundary for deterministic UI tests; test real model integration separately in a controlled environment.
7. Validate direct navigation and server authorization, not only visible navigation.
8. Capture trace, screenshot, and console/network diagnostics on failure.
9. Avoid arbitrary sleeps; wait for observable state and network conditions.
10. Run tests against a production-like build where practical.

## Required Haziri.AI journeys

- Teacher sign-up/sign-in/sign-out and protected dashboard.
- Student sign-in and access limited to their own data.
- Subject creation, editing, and QR join flow.
- Attendance capture/review across multiple photos and faces.
- Present/Absent changes, manual override, discard, and confirm/save.
- Attendance history, filters, and export.
- Unknown face and ambiguous match review.
- Unauthenticated, wrong-role, and cross-owner access denial.
- Refresh, expired session, network failure, and duplicate submission behavior.

## Test data and privacy

- Use synthetic identities and fixture images that are not real student biometric data.
- Keep credentials in local test environment variables or CI secrets.
- Do not print auth tokens or sensitive payloads in test logs.

## Verification

Run the relevant browser matrix and report exact commands, browsers, pass/fail counts, skipped tests, and known flaky cases. Do not mark tests as passing if they were not executed.
