# Haziri.AI — Product Requirements Document (PRD)

> Status: Migration specification  
> Repository: https://github.com/alokprasad573/Haziri.AI  
> Target: Next.js web application  
> Principle: Preserve every current feature and workflow. Replace Streamlit UI and the Python/dlib recognition implementation with the agreed browser stack. Do not silently change business behavior or data semantics.

## 1. Product summary

Haziri.AI (also branded SmartRoll in the current repository) is an AI-assisted attendance management application for educational institutions. Teachers manage subjects, share enrollment links/QR codes, run classroom attendance using one or more photographs, review recognized students, and save attendance records. Students enroll, register their face, join subjects, and view attendance history.

The current application is Python + Streamlit backed by Supabase. The migration replaces Streamlit with Next.js App Router and moves face processing to the browser using MediaPipe plus a validated browser-compatible embedding/recognition stack.

This is a **parity migration**, not a feature redesign. UI may be modernized and made responsive, but user workflows, validation intent, permissions, records, and outcomes must remain equivalent.

## 2. Goals

1. Replace Streamlit with Next.js as the primary UI.
2. Retain all existing Teacher and Student capabilities.
3. Preserve Supabase tables, relationships, and historical data wherever possible.
4. Run image capture, face detection, landmarks, embeddings, and recognition in the browser.
5. Avoid a separately operated FastAPI/Express backend.
6. Use Supabase Auth, PostgreSQL, Storage where needed, and RLS.
7. Make the application typed, testable, accessible, maintainable, and deployable on Vercel.
8. Migrate biometric enrollment safely. Existing dlib vectors must never be treated as compatible with FaceNet/ArcFace vectors.

## 3. Non-goals and prohibited scope

- No removal or simplification of existing workflows.
- No change to attendance/subject enrollment semantics.
- No separate custom Express/FastAPI service.
- No server-side Python face recognition.
- No service-role key in browser code.
- No reuse of dlib 128D vectors with the new embedding model.
- No assumption that MediaPipe Face Landmarker creates identity embeddings.
- No assumption that MediaPipe, FaceNet/ArcFace, and FaceX are automatically interoperable.
- No schema change without review and approval.

## 4. User roles

### 4.1 Teacher
A teacher can:
- Register, receive/use a generated Teacher ID, log in, and log out.
- View profile and dashboard.
- Create/manage their own subjects.
- See student enrollment counts and class/session counts.
- Share subject join links and QR codes.
- Select a subject and take attendance.
- Capture a classroom image from camera or upload one or more images.
- Add, preview, and clear the multiple-photo set.
- Run analysis and review recognized enrolled students, source-photo attribution, and Present/Absent results.
- Discard or confirm/save attendance.
- Use the existing manual attendance override.
- View attendance records and preserve existing report/export capability.

### 4.2 Student
A student can:
- Register with name, email, mobile, age, gender, and face capture.
- Receive/use a generated Student ID.
- Log in using the existing face-based login experience.
- View profile and dashboard.
- View enrolled subjects and attendance statistics.
- Enroll using subject code or a shared QR/join link.
- Unenroll from a subject.
- View attendance history.

### 4.3 Unauthenticated visitor
A visitor can:
- View home and choose Teacher or Student portal.
- Navigate to login/registration.
- Open a shared join-class query URL; enrollment must require student authentication and resume the requested subject after login.

## 5. Functional requirements

Priority: P0 = parity/release blocker; P1 = existing capability that must be inspected and preserved; P2 = quality requirement.

### 5.1 Home and navigation
- **FR-HOME-01 (P0):** Home screen with Student Portal and Teacher Portal.
- **FR-HOME-02 (P0):** Preserve product identity and relevant current static imagery.
- **FR-HOME-03 (P0):** Portal choice routes to the correct role-specific login/registration experience.
- **FR-HOME-04 (P0):** Support the subject join query parameter on the Next.js domain. Unauthenticated users go to student login; after login, enrollment resumes for that subject.
- **FR-HOME-05 (P2):** Responsive navigation and clear loading, empty, error, and success states.

### 5.2 Teacher registration and login
- **FR-TCH-AUTH-01 (P0):** Registration fields: name, email, mobile, gender, password, confirmation.
- **FR-TCH-AUTH-02 (P0):** Preserve Teacher ID generation and display semantics.
- **FR-TCH-AUTH-03 (P0):** Preserve validation intent: required fields, 10-digit mobile, password minimum six characters, confirmation match, duplicate ID/email/mobile checks.
- **FR-TCH-AUTH-04 (P0):** Preserve Teacher ID + password login UX, or use an explicitly approved Supabase Auth linking approach that preserves that UX.
- **FR-TCH-AUTH-05 (P0):** Preserve teacher profile and role.
- **FR-TCH-AUTH-06 (P0):** Logout must revoke session and deny dashboard access.
- **FR-TCH-AUTH-07 (P0):** Do not strand current bcrypt teacher accounts. Account linking/migration must be designed and tested before cutover.

### 5.3 Student registration and face login
- **FR-STU-AUTH-01 (P0):** Registration fields: name, email, mobile, age, gender, face capture.
- **FR-STU-AUTH-02 (P0):** Preserve Student ID generation/display.
- **FR-STU-AUTH-03 (P0):** Preserve required-field validation, age range 5–100, and 10-digit mobile validation.
- **FR-STU-AUTH-04 (P0):** Capture face, detect valid face, generate new-model embedding, reject enrollment if no valid template is produced.
- **FR-STU-AUTH-05 (P0):** Preserve duplicate ID/email/mobile validation.
- **FR-STU-AUTH-06 (P0):** Preserve face-based student login. Identify a candidate from enrolled templates and establish a real authenticated Supabase session for that student.
- **FR-STU-AUTH-07 (P0):** Logout and server/database authorization must protect student identity.
- **FR-STU-AUTH-08 (P0):** Existing dlib vectors must be marked legacy/incompatible and excluded from new-model matching until re-enrollment.

### 5.4 Teacher dashboard
- **FR-TCH-DASH-01 (P0):** Show teacher name, ID, email, mobile, role, and greeting.
- **FR-TCH-DASH-02 (P0):** Preserve Take Attendance, Manage Subjects, Attendance Records dashboard areas.
- **FR-TCH-DASH-03 (P0):** Show useful empty state when teacher has no subjects.
- **FR-TCH-DASH-04 (P2):** Avoid accidental loss of an unsaved attendance photo set during navigation within attendance workflow.

### 5.5 Subject management and QR joining
- **FR-SUB-01 (P0):** Teacher can create subject with code, name, section.
- **FR-SUB-02 (P0):** Preserve current storage normalization: subject name lowercase; section uppercase.
- **FR-SUB-03 (P0):** Teacher sees only their subjects.
- **FR-SUB-04 (P0):** Display code, name, section, enrollment count, class/session count.
- **FR-SUB-05 (P0):** Generate shareable join URL and QR based on subject code.
- **FR-SUB-06 (P0):** Join URL targets deployed Next.js domain, not old Streamlit app.
- **FR-SUB-07 (P0):** Student can enter subject code; validate subject; prevent duplicate enrollment; create relation.
- **FR-SUB-08 (P0):** QR/shared link resumes correct subject enrollment after student login.
- **FR-SUB-09 (P0):** Student can unenroll as in current UI.
- **FR-SUB-10 (P0):** Enforce ownership and identity in RLS, not only UI filtering.

### 5.6 AI attendance
- **FR-ATT-01 (P0):** Teacher must select one of their subjects before analysis.
- **FR-ATT-02 (P0):** Support camera capture and JPG/JPEG/PNG uploads.
- **FR-ATT-03 (P0):** Support multiple classroom photos in one session.
- **FR-ATT-04 (P0):** Preview ordered gallery and clear the selected set; individual removal may be added without removing clear-all.
- **FR-ATT-05 (P0):** Analyze every selected image in browser.
- **FR-ATT-06 (P0):** Detect multiple faces per classroom image.
- **FR-ATT-07 (P0):** Identify only against the selected subject's enrolled students when feasible. If a wider gallery is required, strictly intersect matches with selected subject enrollment before attendance.
- **FR-ATT-08 (P0):** Preserve source-photo attribution for each recognized student.
- **FR-ATT-09 (P0):** Deduplicate a student recognized in multiple images; create one record per student/subject/session.
- **FR-ATT-10 (P0):** Preserve report fields: student name, ID, source photo(s), Present/Absent.
- **FR-ATT-11 (P0):** Include every enrolled student, including unrecognized students as Absent.
- **FR-ATT-12 (P0):** Show confirmation before persistence with Discard and Confirm & Save.
- **FR-ATT-13 (P0):** Discard creates no attendance records.
- **FR-ATT-14 (P0):** Confirm saves student ID, subject ID, boolean present status, timestamp using current semantics.
- **FR-ATT-15 (P0):** On success clear pending gallery/report. On failure preserve review state for safe retry.
- **FR-ATT-16 (P0):** Preserve manual attendance override.
- **FR-ATT-17 (P0):** If no students enrolled, show warning and do not create a report.
- **FR-ATT-18 (P0):** Verify teacher owns selected subject before enrollment read or attendance write.
- **FR-ATT-19 (P2):** Prevent concurrent/double submissions. Prefer idempotency or transaction-safe design; do not change schema without approval.

### 5.7 Student dashboard and records
- **FR-STU-DASH-01 (P0):** Show name, ID, email, mobile, age, gender, role, greeting.
- **FR-STU-DASH-02 (P0):** Show all enrolled subjects.
- **FR-STU-DASH-03 (P0):** Preserve per-subject total and attended counts.
- **FR-STU-DASH-04 (P0):** Provide enroll and unenroll actions.
- **FR-STU-DASH-05 (P0):** Show attendance history with subject and present/absent.
- **FR-STU-DASH-06 (P0):** Student reads only their own profile, enrollment, and attendance data.

### 5.8 Teacher records and export
- **FR-REC-01 (P0):** Show attendance for subjects owned by authenticated teacher.
- **FR-REC-02 (P0):** Preserve student, subject, timestamp, and presence information.
- **FR-REC-03 (P1):** Inspect the full current attendance records component and preserve actual filters/report/export formats; do not invent them.
- **FR-REC-04 (P0):** Preserve existing grouping, filtering, and sorting.
- **FR-REC-05 (P0):** Never expose another teacher's records.

## 6. Agreed technology stack

| Component | Technology |
|---|---|
| Framework | Next.js (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| UI Components | shadcn/ui |
| Face Detection | MediaPipe Face Detector |
| Face Landmarks | MediaPipe Face Landmarker |
| Face Embeddings | Browser-compatible FaceNet / ArcFace |
| Face Recognition | FaceX |
| Animations | Framer Motion |
| Database | Supabase PostgreSQL |
| Authentication | Supabase Auth |
| Storage | Supabase Storage |
| Deployment | Vercel |

Supporting packages can include official Supabase JS/SSR clients, MediaPipe Tasks Vision, ONNX Runtime Web if required by the selected model, React Hook Form, Zod, TanStack Query, and Lucide React.

### Mandatory AI compatibility gate

The table records the desired stack, not proven package interoperability. Before production integration, prove:
1. Which component owns detection (MediaPipe or FaceX's internal detector).
2. Whether Face Landmarker is required for selected embedding-model alignment.
3. Exact FaceNet/ArcFace artifact, version, input size, color normalization, output dimension, license, and browser runtime.
4. Whether FaceX accepts that exact embedding output or bundles its own embedder. Never chain incompatible embedding generators.
5. FaceX supports enrolled-student gallery enrollment and 1:N identification in-browser, not merely 1:1 verification.
6. Multiple faces per image and stable result-to-face mapping work.
7. Unknown-face rejection and confidence calibration work.
8. Mobile/desktop browser performance is acceptable.
9. Model redistribution and hosting comply with license.

If FaceX cannot provide the required 1:N identification with the selected vectors, stop and report the incompatibility. Do not silently implement custom KNN/distance matching or swap the agreed library.

## 7. UX and design

- Professional SaaS UI using current dark navy/slate identity and electric blue accent.
- shadcn/ui accessible primitives.
- Framer Motion selectively for transitions, dialogs, and loading feedback; never delay attendance operations.
- Responsive desktop/tablet/mobile.
- Keyboard and screen-reader accessible forms/dialogs.
- Respect reduced-motion preference.
- Camera denial/unavailability has image-upload fallback.
- Clear progress for model loading and multi-image processing.
- Explicit handling for no face, multiple faces in student enrollment, unknown face, low-quality image, model failure, camera, upload, network, and Supabase errors.
- Never show a recognized identity without passing validated acceptance criteria.

## 8. Security and privacy

- Supabase Auth with server-validated sessions and secure cookie handling.
- Publishable/anon key may be used client-side; service-role keys must never enter the browser bundle.
- RLS on all role/user-scoped records.
- Teacher reads/writes only own subjects, relevant enrollments, and attendance.
- Student reads/writes only own profile, enrollments, and attendance.
- Browser-supplied IDs and AI results are untrusted.
- No embeddings, face frames, passwords, tokens, or sensitive biometric values in logs, URLs, or analytics.
- Keep raw frames in memory unless a documented existing feature requires storage.
- If storage is required, private buckets and least-privilege policies.
- Define biometric consent, retention, deletion, and re-enrollment process before production.
- Attendance must be scoped to authorized subject and current session.
- A privileged operation that cannot be safely expressed via RLS must use a reviewed Next.js server route/server action with server-held credentials, never a browser secret.

## 9. Existing repository baseline and feature mapping

| Existing file | Responsibility | Next.js target |
|---|---|---|
| `app.py` | Role/session routing, join-class query | App Router route flow |
| `src/screens/home_screen.py` | Portal selection | Public home page |
| `src/screens/teacher_screen.py` | Teacher auth/dashboard/tabs | Teacher routes/features |
| `src/screens/student_screen.py` | Student auth/dashboard | Student routes/features |
| `src/components/header.py` | Header/branding | Shared layout |
| `src/ui/base_layout.py` | Theme/profile CSS | Tailwind theme/components |
| `src/components/take_attendance.py` | Multi-photo analysis/report | Attendance capture/review |
| `src/components/dialog_add_photos.py` | Camera/multiple upload | Capture/upload component |
| `src/components/dialog_attendance_box.py` | Discard/confirm/save | Confirmation dialog |
| `src/components/attendance_records.py` | Teacher records/export | Records feature |
| `src/components/manage_subjects.py` | Subject list/share | Subject management |
| `src/components/dialog_create_subjects.py` | Subject creation | Create subject form |
| `src/components/dialog_share_subject_qr.py` | QR/link share | QR share dialog |
| `src/components/dialog_enroll_subject.py` | Student code enrollment | Student enrollment |
| `src/components/subject_cards.py` | Subject display/stats | Shared subject card |
| `src/databases/db.py` | Supabase query/business operations | Typed Supabase data services |
| `src/databases/config.py` | Supabase configuration | Supabase browser/server clients |
| `src/pipelines/face_recognition_pipeline.py` | dlib embeddings/KNN/cache | Browser AI adapter; retire only after sign-off |

Retain/reuse `static/home`, `static/students`, and `static/teachers` assets. Inspect every file before declaring parity.

## 10. Data and compatibility policy

The current code references tables `teachers`, `students`, `subjects`, `subject_students`, and `attendance_logs`. Introspect actual schema, keys, constraints, grants, and existing RLS before implementation.

- Do not rename/drop current tables or columns.
- Keep Teacher ID and Student ID stable.
- Keep historical attendance rows/timestamps intact.
- Current teacher credentials are bcrypt hashes in `teachers`; they are not automatically Supabase Auth identities.
- Current student face vectors are dlib 128D embeddings; they are incompatible with FaceNet/ArcFace.
- Preserve legacy vectors untouched until an approved retention/deletion decision.
- New templates must be model-versioned and dimension-aware. If current JSON field cannot represent this safely, propose the smallest additive schema change and request approval first.
- Students must visibly re-enroll under the new model before new face login/attendance matching.
- Account migration must preserve business IDs, ownership, and login experience.

## 11. Non-functional requirements

- **Performance:** Render pages without waiting for model download; load AI lazily on enrollment/login/attendance.
- **Responsiveness:** Core dashboard and forms usable on supported mobile and desktop.
- **Reliability:** Failed attendance saves retain review state and never show false success.
- **Correctness:** One row/student/session even if detected in several images.
- **Security:** Test RLS allow/deny boundaries.
- **Maintainability:** TypeScript strict mode, typed service contracts, modular features.
- **Accessibility:** Keyboard navigation, labels, focus, reduced motion.
- **Privacy:** No biometric data in logs/URLs/analytics.
- **Compatibility:** Document supported browsers and camera/WebGL/WebGPU/WASM requirements.
- **Observability:** Log operational errors without face images/templates.

## 12. Acceptance criteria

Migration is complete only when:
1. Next.js replaces Streamlit as primary UI.
2. Teacher/student registration, login, logout, dashboards work.
3. Teacher and Student ID workflows are preserved.
4. All subject management, QR share, subject-code enrollment, and unenrollment work.
5. Shared join links resume correct enrollment in Next.js.
6. Face enrollment and face-based login work using a versioned new model.
7. Legacy dlib vectors are never compared with new vectors.
8. Attendance supports camera, multiple uploads, multiple faces, photo attribution, selected-subject scoping, Present/Absent preview, discard, confirm/save.
9. Manual attendance override works.
10. Teacher records, existing filters and exports are preserved.
11. Student subject stats and attendance history are preserved.
12. Existing schema/history remain compatible unless an approved additive migration is documented.
13. RLS isolation tests pass.
14. No service-role secret is exposed to browser.
15. Duplicate attendance submission is addressed.
16. All P0 tests pass; model accuracy and performance evaluation is documented.
17. Setup/model licenses/environment/deployment docs exist.

## 13. Delivery plan

### Phase 0 — Audit and spikes
- Inspect all current components and database functions.
- Capture workflow screenshots/behavior baselines.
- Inspect Supabase schema, constraints, and RLS.
- Prototype MediaPipe + embedding model + FaceX compatibility.
- Resolve Supabase Auth migration for bcrypt teachers and face-login students.
- Produce feature traceability and risk register.

Exit gate: no production migration until AI compatibility and auth migration are demonstrably feasible.

### Phase 1 — Next.js foundation
- Add App Router, strict TypeScript, Tailwind, shadcn/ui, Framer Motion.
- Configure Supabase browser/server clients.
- Add layouts, theme, responsive navigation.
- Keep Streamlit runnable.

### Phase 2 — Auth/data
- Port database operations as typed Supabase services.
- Implement RLS reviewed against actual schema.
- Implement teacher/student auth linking/session flow.
- Preserve IDs/profile behavior.

### Phase 3 — Feature parity
- Home and portals.
- Teacher auth/dashboard/subjects/QR.
- Student auth/dashboard/enrollment.
- Attendance records/export.

### Phase 4 — Browser AI
- Model lifecycle/loading.
- Face enrollment.
- Face login.
- Multi-photo classroom attendance.
- Preview/discard/manual override/save.
- Calibrate threshold using consented representative data.

### Phase 5 — Verification and cutover
- Run parity, RLS, end-to-end, device, and performance tests.
- Deploy Vercel preview.
- Cut over only after sign-off.
- Retain Streamlit deployment/rollback until stabilization.

## 14. Open decisions (must be answered, not guessed)

1. Exact FaceX package/repository/version and whether it supports in-browser 1:N gallery search.
2. Whether FaceX bundles embedding model or accepts external FaceNet/ArcFace output.
3. Whether both MediaPipe detector and landmarker remain needed.
4. Exact embedding model artifact, dimension, license, and runtime.
5. Supabase Auth linking approach for bcrypt teacher accounts and face-login students.
6. Actual RLS/schema support for Auth user mapping, template versioning, and idempotency.
7. Exact filters/export formats from the full existing attendance records component.
8. Whether current camera images are persisted or only held in Streamlit session memory.