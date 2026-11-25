---
name: react-typescript
description: Applies strict TypeScript and maintainable React patterns for components, hooks, state, async UI, and typed application contracts in Haziri.AI.
---

# React and TypeScript

## When to use

Use when implementing or refactoring React components, hooks, client state, props, async interactions, or shared TypeScript contracts.

## Procedure

1. Read nearby code and follow established naming, folder, and import conventions.
2. Define domain types from the actual API/database contract; do not duplicate or guess database shapes.
3. Prefer explicit props and discriminated unions for stateful UI.
4. Keep components focused on rendering and interaction; move business logic into domain services or hooks with clear ownership.
5. Use hooks only at the top level and keep effect dependencies correct.
6. Cancel or ignore stale async work where components can unmount or requests can race.
7. Model loading, success, empty, and error states explicitly.
8. Use runtime validation at trust boundaries; TypeScript types alone do not validate network input.
9. Prefer immutable updates and stable keys. Avoid index keys for mutable collections.
10. Avoid `any`, unsafe casts, non-null assertions, and broad catch blocks. If unavoidable, document the invariant and narrow the scope.

## Haziri.AI-specific rules

- Separate teacher, student, subject, and attendance domain types.
- Never treat client-supplied role or student identity as authorization proof.
- Keep camera/MediaPipe objects in client-only modules and clean up streams, listeners, workers, and GPU resources.
- Do not store biometric data in browser persistence.
- Attendance state transitions must be explicit: draft/review, confirmed/saved, or discarded as defined by the product contract.

## Verification

Use strict type-checking, component tests for meaningful behavior, and lint. Test race conditions, repeated clicks, unmount cleanup, empty arrays, and malformed API responses.
