# Haziri.AI — Architecture & System Design

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack, React 19) |
| Language | TypeScript (strict mode) |
| Styling & UI | Tailwind CSS v4, Radix UI, shadcn-style primitives, Lucide React, Sonner |
| 3D Visualization & Motion | Three.js, React Three Fiber, Drei, Framer Motion, HTML5 2D Animated Fluid Canvas |
| Browser Face Detection & Landmarks | `@mediapipe/tasks-vision` (MediaPipe Face Detector + 478-point Face Landmarker) |
| Browser Face Embeddings & Matching | `onnxruntime-web` (OpenCV SFace 128D ONNX) + L2-normalized Cosine Similarity Matcher |
| Forms & Runtime Validation | React Hook Form, Zod |
| Backend & Session Boundary | Next.js Route Handlers, Server Components, `proxy.ts` (`@supabase/ssr`) |
| Database & Security | Supabase PostgreSQL with Row Level Security (RLS) and Transactional RPCs |
| Authentication | Supabase Auth (Email/Password + Face-Verified Email Sign-In Link / OTP) |
| QR Enrollment | `qrcode` (client-side QR PNG generation & deep-link continuation) |
| Testing & CI/CD | Vitest, Playwright, ESLint, GitHub Actions, Vercel |

---

## System Design

### 1. High-Level System Architecture

```mermaid
flowchart TD
    subgraph Client["Browser Client (Untrusted Zone)"]
        UI["Next.js React UI & Dashboards"]
        HUD["3D Platinum Landmark Mesh (Three.js / R3F) & Live Scanner"]
        FLUID["Global Animated Fluid Canvas (2D)"]
        MP["MediaPipe Detector + 478-pt Landmarker (WASM)"]
        ONNX["ONNX Runtime Web (SFace 128D Embedder)"]
        MATCH["Local 1:N Cosine Matcher & Roster Aggregator"]

        UI --- HUD
        UI --- FLUID
        HUD --> MP
        UI --> MP
        MP --> ONNX
        ONNX --> MATCH
    end

    subgraph NextServer["Next.js App Router Server (Vercel / Node.js)"]
        PROXY["proxy.ts (Supabase SSR Session Refresh & Route Guards)"]
        RSC["Server Components (Teacher & Student Dashboards)"]
        API["Route Handlers (/api/auth/*, /api/teacher/*, /api/student/*)"]
        CB["/auth/callback (PKCE Code & Token Hash Exchange)"]
        ZOD["Zod Runtime Schema Validation & Rate Limiter"]
        SVC["Domain & Service Layer (auth, subjects, attendance)"]

        PROXY --> RSC
        PROXY --> API
        API --> ZOD
        ZOD --> SVC
        RSC --> SVC
        CB --> SVC
    end

    subgraph Supabase["Supabase Platform (Trusted Security Boundary)"]
        AUTH["Supabase Auth (JWT Sessions & SMTP Email Delivery)"]
        RLS["PostgreSQL Row Level Security (7 Tables)"]
        RPC["PostgreSQL RPCs (verify_student_face_for_otp, save_attendance_session, delete_teacher_subject)"]
        PG[("Supabase PostgreSQL")]

        RLS --> PG
        RPC --> PG
    end

    UI -->|"HTTPS + HttpOnly Auth Cookies"| PROXY
    UI -->|"Email Sign-In Link"| CB
    SVC -->|"@supabase/ssr Server Client"| AUTH
    SVC -->|"@supabase/ssr Server Client"| RLS
    SVC -->|"@supabase/ssr Server Client"| RPC
```

---

### 2. Browser Biometric Face Recognition Pipeline

```mermaid
flowchart LR
    IN["Camera Frame / Uploaded Classroom Photos (In-Memory)"] --> DET["MediaPipe Face Detector"]
    DET --> QC["Bounding Box & Quality Gate"]
    QC --> LM["MediaPipe 478-Point Face Landmarker"]
    LM --> ALIGN["5-Point Affine Face Alignment (112x112)"]
    ALIGN --> SFACE["ONNX Runtime Web: OpenCV SFace Model"]
    SFACE --> NORM["128D Float32 L2-Normalized Vector"]

    NORM -->|"Student Enrollment"| TPL["POST /api/student/templates (Versioned Template Storage)"]
    NORM -->|"Student FaceID Login"| VERIFY["POST /api/auth/student/face-login -> PostgreSQL Cosine RPC"]
    NORM -->|"Teacher Multi-Photo Attendance"| GALLERY["1:N Match Against Enrolled Subject Gallery (Threshold >= 0.363)"]

    GALLERY --> DEDUP["Multi-Photo Deduplication & Source Attribution"]
    DEDUP --> REVIEW["Teacher Attendance Review & Manual Override"]
    REVIEW --> SAVE["POST /api/teacher/attendance/save (Idempotent Session Write)"]
```

---

### 3. Student FaceID Login & Email Verification Flow

```mermaid
sequenceDiagram
    actor Student
    participant UI as Student Login UI
    participant AI as Browser AI (MediaPipe + SFace)
    participant API as Next.js Auth Route Handlers
    participant DB as Supabase PostgreSQL RPC
    participant Auth as Supabase Auth (Email)

    Student->>UI: Enter Student ID / Email & Scan Face
    UI->>AI: Detect single face & extract 128D SFace vector
    AI-->>UI: Versioned 128D embedding vector
    UI->>API: POST /api/auth/student/face-login
    API->>DB: RPC verify_student_face_for_otp(identifier, vector, threshold >= 0.363)
    alt Face Mismatch or No Active Template
        DB-->>API: verified = false (zero vector/score leak)
        API-->>UI: HTTP 401 / 404 Verification Error
    else Face Matched
        DB-->>API: verified = true, student_id, email_id
        API->>Auth: signInWithOtp(email, shouldCreateUser: false)
        Auth-->>Student: Send One-Time Sign-In Link / 6-Digit OTP Email
        API-->>UI: HTTP 200 (maskedEmail, challenge active)
        alt Student Clicks Sign-In Link
            Student->>API: GET /auth/callback?code=... (or token_hash)
            API->>Auth: exchangeCodeForSession / verifyOtp
            Auth-->>API: Valid Session Cookies
            API-->>Student: 307 Redirect -> /student/dashboard
        else Student Enters 6-Digit OTP Code
            Student->>UI: Submit 6-Digit Email OTP
            UI->>API: POST /api/auth/student/face-login/verify-otp
            API->>Auth: verifyOtp(email, token, type: email / magiclink)
            Auth-->>API: Valid Session Cookies
            API-->>UI: HTTP 200 -> Navigate to /student/dashboard
        end
    end
```

---

### 4. Multi-Photo Classroom Attendance & Subject Management Flow

```mermaid
sequenceDiagram
    actor Teacher
    participant UI as Teacher Dashboard UI
    participant AI as Browser AI Engine
    participant API as Next.js Teacher API
    participant DB as Supabase PostgreSQL (RLS + RPC)

    rect rgb(20, 23, 25)
        Note over Teacher,DB: Subject Lifecycle (Create, Share QR, Delete)
        Teacher->>UI: Create Subject (code, name, section)
        UI->>API: POST /api/teacher/subjects
        API->>DB: INSERT public.subjects (RLS teacher_id check)
        DB-->>UI: Created Subject + QR Join Link

        Teacher->>UI: Confirm Delete Subject
        UI->>API: DELETE /api/teacher/subjects
        API->>DB: DELETE public.subjects (ON DELETE CASCADE / delete_teacher_subject RPC)
        DB-->>UI: Deleted Subject + Cascade Cleanup
    end

    rect rgb(20, 23, 25)
        Note over Teacher,DB: Multi-Photo Attendance Session
        Teacher->>UI: Select Owned Subject
        UI->>API: GET /api/teacher/attendance/roster?subjectId=...
        API->>DB: Load Enrolled Students & Active SFace Templates (RLS)
        DB-->>UI: Scoped Subject Gallery
        Teacher->>UI: Capture / Upload Multiple Classroom Photos
        UI->>AI: Detect & Match All Faces Across Photos (In-Memory)
        AI-->>UI: Deduplicated Present/Absent Table + Source Photo Labels
        Teacher->>UI: Apply Manual Overrides & Click Confirm Save
        UI->>API: POST /api/teacher/attendance/save (with UUID idempotencyKey)
        API->>DB: RPC save_attendance_session (Transactional, RLS Enforced)
        DB-->>UI: session_id, inserted_count, deduplicated flag
        UI-->>Teacher: Clear In-Memory Photos & Show Confirmation
    end
```
