# Haziri.AI — AI-Powered Attendance Platform

<p align="left">
  <img src="https://img.shields.io/badge/Next.js-16-090A0B?style=for-the-badge&logo=nextdotjs&logoColor=B9D0D8" alt="Next.js 16" />
  <img src="https://img.shields.io/badge/React-19-141719?style=for-the-badge&logo=react&logoColor=B9D0D8" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-Strict-141719?style=for-the-badge&logo=typescript&logoColor=B9D0D8" alt="TypeScript Strict" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-v4-141719?style=for-the-badge&logo=tailwindcss&logoColor=B9D0D8" alt="Tailwind CSS v4" />
  <img src="https://img.shields.io/badge/Three.js-R3F-141719?style=for-the-badge&logo=threedotjs&logoColor=B9D0D8" alt="Three.js & React Three Fiber" />
  <img src="https://img.shields.io/badge/Framer_Motion-Animated-141719?style=for-the-badge&logo=framer&logoColor=CDBF9D" alt="Framer Motion" />
  <img src="https://img.shields.io/badge/MediaPipe-478--pt_Mesh-22272A?style=for-the-badge&logo=google&logoColor=B9D0D8" alt="MediaPipe" />
  <img src="https://img.shields.io/badge/ONNX_Runtime_Web-SFace_128D-22272A?style=for-the-badge&logo=onnx&logoColor=B9D0D8" alt="ONNX Runtime Web" />
  <img src="https://img.shields.io/badge/Supabase-PostgreSQL_%2B_RLS-141719?style=for-the-badge&logo=supabase&logoColor=76C4A4" alt="Supabase" />
  <img src="https://img.shields.io/badge/Zod-Validated-141719?style=for-the-badge&logo=zod&logoColor=91AAB4" alt="Zod" />
  <img src="https://img.shields.io/badge/Vitest-Unit_%26_Security-141719?style=for-the-badge&logo=vitest&logoColor=CDBF9D" alt="Vitest" />
  <img src="https://img.shields.io/badge/Playwright-E2E-141719?style=for-the-badge&logo=playwright&logoColor=B9D0D8" alt="Playwright" />
  <a href="./LICENSE">
    <img src="https://img.shields.io/badge/License-MIT-22272A?style=for-the-badge&labelColor=090A0B&color=B9D0D8" alt="MIT License" />
  </a>
</p>

**Haziri.AI** is a privacy-first, AI-powered classroom attendance management platform built with **Next.js App Router**, **TypeScript**, **in-browser MediaPipe + OpenCV SFace 128D facial recognition**, and **Supabase PostgreSQL (Auth + Row Level Security)**.

All face detection, 478-point landmark alignment, and 128D embedding extraction run directly inside the browser (WebAssembly / ONNX Runtime Web) with zero raw classroom photo persistence on servers.

---

## Key Features

### Teacher Portal
- **Subject Management**: Create courses with normalized codes/sections, generate downloadable **QR Code & shareable join links**, and permanently **delete subjects** with cascading cleanup.
- **Multi-Photo Classroom Attendance**: Capture live frames or upload multiple classroom photos in-memory; detect and deduplicate recognized students across photos with source-photo attribution.
- **Human-in-the-Loop Verification**: Review matched vs. absent students, flag unknown faces, apply manual attendance overrides, discard safely without DB writes, or save with UUID idempotency protection.
- **Attendance Records & CSV Export**: Filter historical sessions by subject and date, inspect per-session student entries, and export clean CSV reports.

### Student Portal
- **Dual Authentication**: Sign in via Student ID / Email + Password, or **Passwordless FaceID Login** (browser 128D SFace probe verified inside PostgreSQL RPC → Supabase Auth one-time email Sign-In Link / OTP).
- **Biometric Template Enrollment**: Guided single-face capture with live MediaPipe landmark tracking and explicit consent storing versioned 128D SFace templates.
- **Course Enrollment**: Join subjects instantly via Teacher QR deep-link (`/?join-class=CODE`) or manual subject code, and unenroll anytime.
- **Attendance Analytics**: Track per-subject attendance percentages, overall metrics, and full attendance history.

### Interface & Visualization
- **Monochrome Platinum Spatial Glass UI**: Dark architectural design system (`#090A0B`, `#141719`, `#22272A`, `#B9D0D8`, `#91AAB4`, `#CDBF9D`, `#F5F6F6`, `#A0A9AC`).
- **3D Facial Landmark Mesh**: Interactive Three.js / React Three Fiber platinum mesh driven by live MediaPipe 478-point coordinates when the scanner is active.
- **Global Animated Fluid Canvas**: Hardware-composited 2D fluid background across all pages with pointer wake currents, visibility auto-pause, and `prefers-reduced-motion` support.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 16 (App Router, Turbopack), React 19 |
| **Language** | TypeScript (strict mode) |
| **Styling & UI** | Tailwind CSS v4, Radix UI, shadcn-style primitives, Lucide React, Sonner |
| **3D & Animations** | Three.js, React Three Fiber, Drei, Framer Motion, HTML5 2D Fluid Canvas |
| **Face Detection & Landmarks** | `@mediapipe/tasks-vision` (MediaPipe Face Detector + 478-point Face Landmarker) |
| **Face Embeddings & Matching** | `onnxruntime-web` (OpenCV SFace 128D ONNX) + L2-normalized Cosine Similarity Matcher |
| **Forms & Validation** | React Hook Form, Zod |
| **Backend & Session Boundary** | Next.js Route Handlers, Server Components, `proxy.ts` (`@supabase/ssr`) |
| **Database & Auth** | Supabase PostgreSQL (Row Level Security + Transactional RPCs), Supabase Auth |
| **Utilities** | `qrcode` (QR enrollment PNG generation), `bcryptjs` (legacy compatibility) |
| **Testing & CI/CD** | Vitest, Playwright, ESLint, GitHub Actions, Vercel |

---

## System Design

> For complete sequence diagrams (FaceID Email Sign-In Link / OTP flow & Multi-Photo Classroom Attendance flow), see **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**.

### High-Level Architecture

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
        AUTH["Supabase Auth (JWT Sessions & Email Delivery)"]
        RLS["PostgreSQL Row Level Security (7 Tables)"]
        RPC["PostgreSQL RPCs (Face Verify, Attendance Save, Subject Delete)"]
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

### Browser Biometric Pipeline

```mermaid
flowchart LR
    IN["Camera Frame / Uploaded Classroom Photos (In-Memory)"] --> DET["MediaPipe Face Detector"]
    DET --> QC["Bounding Box & Quality Gate"]
    QC --> LM["MediaPipe 478-Point Face Landmarker"]
    LM --> ALIGN["5-Point Affine Face Alignment (112x112)"]
    ALIGN --> SFACE["ONNX Runtime Web: OpenCV SFace Model"]
    SFACE --> NORM["128D Float32 L2-Normalized Vector"]

    NORM -->|"Student Enrollment"| TPL["POST /api/student/templates"]
    NORM -->|"Student FaceID Login"| VERIFY["POST /api/auth/student/face-login -> PostgreSQL RPC"]
    NORM -->|"Teacher Attendance"| GALLERY["1:N Match Against Scoped Subject Gallery (>= 0.363)"]

    GALLERY --> DEDUP["Multi-Photo Deduplication & Attribution"]
    DEDUP --> REVIEW["Teacher Review & Manual Override"]
    REVIEW --> SAVE["POST /api/teacher/attendance/save (Idempotent)"]
```

---

## Database ER Diagram

> For the full PostgreSQL SQL DDL, indexes, Row Level Security rules, triggers, and RPC reference, see **[docs/DATABASE.md](docs/DATABASE.md)**.

```mermaid
erDiagram
    auth_users ||--o| teachers : links_identity
    auth_users ||--o| students : links_identity
    teachers ||--o{ subjects : owns
    teachers ||--o{ attendance_sessions : conducts
    students ||--o{ student_face_templates : enrolls_biometrics
    student_face_templates |o--o| students : active_template_ref
    subjects ||--o{ subject_students : has_enrollments
    students ||--o{ subject_students : enrolls_in
    subjects ||--o{ attendance_sessions : tracks_sessions
    attendance_sessions ||--o{ attendance_logs : groups_entries
    subjects ||--o{ attendance_logs : records_for
    students ||--o{ attendance_logs : marked_in

    auth_users {
        uuid id PK
        text email
        timestamptz email_confirmed_at
    }

    teachers {
        text id PK
        text name
        text email_id UK
        text mobile_number UK
        text gender
        text password
        uuid auth_user_id UK, FK
        timestamptz created_at
    }

    students {
        text id PK
        text name
        text email_id UK
        text mobile_number UK
        integer age
        text gender
        uuid auth_user_id UK, FK
        uuid active_face_template_id FK
        timestamptz created_at
    }

    student_face_templates {
        uuid id PK
        text student_id FK
        text model_id
        text model_version
        text preprocessing_version
        integer embedding_dimension
        jsonb vector
        boolean is_active
        timestamptz consent_granted_at
        timestamptz created_at
        timestamptz updated_at
    }

    subjects {
        bigint id PK
        text code UK
        text name
        text section
        text teacher_id FK
        timestamptz created_at
    }

    subject_students {
        bigint subject_id PK, FK
        text student_id PK, FK
        timestamptz created_at
    }

    attendance_sessions {
        uuid id PK
        bigint subject_id FK
        text teacher_id FK
        uuid idempotency_key UK
        timestamptz recorded_at
        integer photo_count
        timestamptz created_at
    }

    attendance_logs {
        bigint id PK
        timestamptz timestamp
        bigint subject_id FK
        text student_id FK
        boolean is_present
        uuid session_id FK
        text_array source_photos
        boolean is_manual_override
    }
```

---

## Documentation Reference

| Document | Contents |
|---|---|
| **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** | Complete Tech Stack & Mermaid System Design (High-Level Architecture, Biometric Pipeline, FaceID Auth Sequence, Multi-Photo Attendance & Subject Lifecycle Sequence) |
| **[docs/DATABASE.md](docs/DATABASE.md)** | Complete Database Schema (ER Diagram, PostgreSQL SQL DDL, Constraints, Indexes, Table Summary, RLS & RPC Functions) |

---

## Project Structure

```text
Haziri.AI/
├── web/                             # Next.js 16 App Router application (TypeScript strict)
│   ├── public/
│   │   ├── brand/                   # Haziri.AI Face Scanner SVG mark
│   │   └── models/                  # Browser-hosted MediaPipe & SFace ONNX model assets
│   ├── src/
│   │   ├── app/                     # App Router pages, layouts, and API Route Handlers
│   │   ├── components/              # UI primitives, 3D scene, biometric HUD, dashboards
│   │   ├── domain/                  # Pure domain logic (IDs, biometrics, attendance math)
│   │   ├── features/                # MediaPipe + SFace ONNX recognition engine & matcher
│   │   ├── lib/                     # Supabase SSR clients, Zod schemas, rate limiter, motion
│   │   ├── services/                # Server-only business services (auth, subjects, attendance)
│   │   └── types/                   # Typed Supabase PostgreSQL database contract
│   └── tests/                       # Vitest unit/security tests & Playwright E2E specs
├── supabase/
│   ├── migrations/                  # Incremental SQL migrations (schema, RLS, RPCs, cascade delete)
│   ├── staging_bootstrap.sql        # Combined idempotent bootstrap SQL for fresh Supabase projects
│   └── tests/                       # Multi-identity PostgreSQL RLS isolation test script
├── docs/
│   ├── ARCHITECTURE.md              # Tech Stack & System Design (Mermaid diagrams)
│   └── DATABASE.md                  # PostgreSQL Database Schema & ER Diagram
├── .github/workflows/
│   └── web-ci.yml                   # Automated lint, type-check, test, and production build CI
├── LICENSE                          # MIT License
└── README.md
```

---

## Local Setup

### 1. Prerequisites
- **Node.js 22+** and **npm**
- A **Supabase** project (PostgreSQL + Auth)

### 2. Database Initialization
Run `supabase/staging_bootstrap.sql` (or apply files in `supabase/migrations/` sequentially) in your **Supabase SQL Editor** to create tables, indexes, Row Level Security policies, triggers, and RPC functions.

*(Optional — for 6-digit OTP codes in addition to Sign-In Links during Student FaceID Login)*: In **Supabase Dashboard → Authentication → Email Templates → Magic Link**, include `{{ .Token }}` alongside the sign-in link (`{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=email&next=/student/dashboard`).

### 3. Configure Environment Variables
Copy `.env.example` into `web/.env.local`:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<your-supabase-publishable-key>
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

> **Security Note**: Never expose `SUPABASE_SERVICE_ROLE_KEY` in client code or `NEXT_PUBLIC_*` variables. Haziri.AI operates with zero service-role key usage by enforcing Supabase Auth + PostgreSQL RLS and narrow RPCs.

### 4. Install & Run

```bash
cd web
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Verification & Quality Commands

Run from `web/`:

```bash
npm run lint        # ESLint
npm run type-check  # TypeScript strict check (tsc --noEmit)
npm run test        # Vitest unit & API security boundary tests
npm run build       # Next.js production build
npm run test:e2e    # Playwright desktop & mobile E2E tests
```

---

## Security & Privacy Model

- **Zero Raw Biometric Photo Persistence**: Classroom attendance photos stay strictly in browser memory and are cleared immediately after save or discard.
- **Model-Versioned Templates**: Only mathematical 128D SFace embedding vectors (`student_face_templates`) are stored with explicit student consent timestamps.
- **Server & Database Trust Boundary**: All browser inputs, IDs, and match claims are treated as untrusted; authorization is enforced on Next.js server boundaries and PostgreSQL Row Level Security across all 7 tables.
- **Zero Service-Role Exposure**: Registration conflict checks, identifier resolution, face-login cosine matching, idempotent attendance writes, and cascading subject deletion run through least-privilege PostgreSQL RPCs and RLS policies.

---

## License

This project is licensed under the **MIT License** — see the [LICENSE](./LICENSE) file for details.

---

<p align="center">
  Made with ❤️ by <strong>Alok Prasad</strong>
</p>
