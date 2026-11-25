---
trigger: always_on
description: Enforces Haziri.AI system boundaries, approved stack, source-of-truth documents, and migration safety across all implementation work.
---

# Architecture Rules

- Treat `PRD.md`, `ARCHITECTURE.md`, and `DATABASE.md` as the project source of truth. Read relevant sections before implementation.
- Preserve feature parity with the existing Haziri.AI/SmartRoll application unless the user approves a scope change.
- Target Next.js App Router, TypeScript strict mode, Tailwind CSS, shadcn/ui, MediaPipe, a verified FaceNet/ArcFace embedding runtime, FaceX only if proven compatible, Supabase PostgreSQL/Auth/Storage, and Vercel.
- Do not introduce a separately operated Express/FastAPI backend without an explicit architecture decision.
- Keep domain logic independent of React and persistence SDKs.
- Keep trusted authorization and privileged operations on the server/database.
- Keep the legacy Streamlit application operational until the new application passes acceptance and cutover is approved.
- Do not silently invent requirements, schema fields, API contracts, model capabilities, or business rules. Surface uncertainty and request a decision.
- Define interfaces and file ownership before parallel agent work. Avoid concurrent edits to the same files.
- For each feature, state acceptance criteria and verify with tests, lint, type-check, and build.
