---
trigger: always_on
description: Enforces maintainable TypeScript, React, Next.js, error-handling, and code-review standards for Haziri.AI.
---

# Coding Standards

- Use TypeScript strict mode and preserve useful inferred types. Avoid `any`, unsafe casts, non-null assertions, and ignored compiler errors.
- Validate untrusted input at runtime with Zod or the existing approved validation library.
- Keep functions and components focused; extract domain logic from UI and route handlers.
- Use explicit return types for exported domain/service functions when they improve contract clarity.
- Handle expected failures explicitly. Do not swallow exceptions or return fake success values.
- Use structured, actionable logs on trusted server code; never log secrets, tokens, raw biometric data, or unnecessary student PII.
- Use async/await with deliberate cancellation, timeout, and retry behavior. Retry only operations that are safe/idempotent.
- Avoid duplicated business rules, hidden global state, premature abstractions, and unnecessary dependencies.
- Follow the repository's formatter, lint rules, naming conventions, and import aliases.
- Add or update tests for behavior changes and bug fixes.
- Do not rewrite unrelated files or perform broad refactors without a clear requirement.
- Before finishing, inspect the diff and run relevant lint, type-check, tests, and production build. Report commands and actual results.
