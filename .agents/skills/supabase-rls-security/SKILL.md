---
name: supabase-rls-security
description: Designs, implements, and tests least-privilege PostgreSQL Row Level Security policies and Supabase authorization boundaries for Haziri.AI.
---

# Supabase RLS Security

## When to use

Use whenever creating or changing tables, views, functions, Storage policies, user roles, or any operation that reads or writes teacher/student/subject/attendance data.

## Security model

- Enable RLS on every table exposed through the Supabase Data API.
- Deny by default. Add narrowly scoped policies for required operations only.
- Derive identity from the authenticated Supabase session (for example, `auth.uid()`), never from a client-supplied user ID.
- Model teacher ownership and student membership using verified relational joins and constraints.
- Ensure a teacher can access only their own subjects and related attendance data.
- Ensure a student can access only their own permitted profile, joined subjects, and attendance records.
- Do not allow students to self-assert attendance or alter teacher-controlled attendance decisions unless explicitly specified in the PRD.
- Treat Storage as a separate authorization surface; table RLS does not secure Storage objects.

## Procedure

1. Inventory all tables, views, functions, Storage buckets, grants, and existing policies.
2. Define an access matrix for SELECT, INSERT, UPDATE, and DELETE per role and resource.
3. Enable RLS and revoke unnecessary grants where appropriate.
4. Write policies with explicit ownership/membership predicates.
5. Use safe, schema-qualified helper functions only when necessary; review SECURITY DEFINER functions carefully.
6. Avoid recursive policy references and untrusted search_path behavior.
7. Test with at least two teachers and two students to prove isolation.
8. Test anonymous access, wrong-role access, forged IDs, and direct API calls bypassing the UI.
9. Add migration tests and document policy intent.

## Prohibited shortcuts

- No `USING (true)` or `WITH CHECK (true)` for user data.
- No policy that trusts a submitted `teacher_id` or `student_id` without binding it to `auth.uid()`.
- No assumption that hidden UI controls provide security.
- No service-role key in browser code.
- No production policy rollout without backup, review, and staged verification.

## Deliverables

Provide the access matrix, SQL migration, tests, and a clear explanation of why each policy permits or denies each operation.
