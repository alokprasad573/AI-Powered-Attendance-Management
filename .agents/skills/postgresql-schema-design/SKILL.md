---
name: postgresql-schema-design
description: Designs relational PostgreSQL schemas, constraints, indexes, safe migrations, and query patterns for the Haziri.AI attendance domain.
---

# PostgreSQL Schema Design

## When to use

Use when modifying relational data structures, constraints, indexes, SQL functions, migrations, or performance-sensitive queries.

## Procedure

1. Inspect the real schema, migration history, constraints, indexes, and representative data before proposing changes.
2. Read `DATABASE.md`, but treat its supplied SQL as contextual reference only unless independently verified.
3. Define entities, cardinality, ownership, lifecycle, and deletion behavior before writing SQL.
4. Prefer normalized relational data; denormalize only with measured justification and a consistency plan.
5. Add foreign keys and check constraints for invariants that must hold regardless of application code.
6. Add indexes based on actual query predicates, joins, ordering, and measured query plans.
7. Use versioned migrations. Prefer expand-and-contract changes for live systems.
8. Make backfills bounded, restartable, observable, and safe to retry.
9. Consider transaction boundaries, locking, concurrent writes, and idempotency.
10. Regenerate TypeScript database types after approved schema changes.

## Haziri.AI-specific considerations

- Preserve teacher, subject, student, subject-membership, and attendance relationships.
- Attendance may contain multiple sessions for the same subject/student pair; do not add a uniqueness rule that incorrectly collapses separate sessions.
- Define the attendance-session identity and duplicate policy explicitly.
- Preserve source-photo attribution and manual correction history if required by the PRD.
- Keep biometric embeddings separate from ordinary profile fields and apply explicit access/retention controls.
- Legacy dlib embeddings are not interchangeable with FaceNet/ArcFace embeddings.

## Verification

Run migrations against a disposable/staging database, verify constraints and row counts, test rollback or forward recovery, inspect EXPLAIN plans for critical queries, and test concurrent attendance submissions. Never execute destructive production SQL without explicit approval.
