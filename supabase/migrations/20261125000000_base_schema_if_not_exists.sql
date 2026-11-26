-- Haziri.AI Migration 0000: Idempotent Base Schema (Safe for Fresh Staging Projects)
-- Preserves the exact 5-table schema documented in docs/DATABASE.md.
-- Safe to run on both fresh staging databases and existing databases (IF NOT EXISTS).

BEGIN;

CREATE TABLE IF NOT EXISTS public.teachers (
  id text NOT NULL,
  name text NOT NULL,
  email_id text NOT NULL UNIQUE,
  mobile_number text NOT NULL UNIQUE,
  gender text NOT NULL,
  password text NOT NULL,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT teachers_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.students (
  id text NOT NULL,
  name text NOT NULL,
  email_id text NOT NULL UNIQUE,
  mobile_number text NOT NULL UNIQUE,
  age integer NOT NULL,
  gender text NOT NULL,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT students_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.subjects (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  code text NOT NULL UNIQUE,
  name text NOT NULL DEFAULT 'unknown'::text,
  section text NOT NULL DEFAULT 'N/A'::text,
  teacher_id text,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT subjects_pkey PRIMARY KEY (id),
  CONSTRAINT subjects_teacher_id_fkey
    FOREIGN KEY (teacher_id) REFERENCES public.teachers(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.subject_students (
  subject_id bigint NOT NULL,
  student_id text NOT NULL,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT subject_students_pkey PRIMARY KEY (subject_id, student_id),
  CONSTRAINT subject_students_subject_id_fkey
    FOREIGN KEY (subject_id) REFERENCES public.subjects(id) ON DELETE CASCADE,
  CONSTRAINT subject_students_student_id_fkey
    FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.attendance_logs (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  "timestamp" timestamptz DEFAULT now(),
  subject_id bigint,
  student_id text,
  is_present boolean DEFAULT true,
  CONSTRAINT attendance_logs_pkey PRIMARY KEY (id),
  CONSTRAINT attendance_logs_subject_id_fkey
    FOREIGN KEY (subject_id) REFERENCES public.subjects(id) ON DELETE CASCADE,
  CONSTRAINT attendance_logs_student_id_fkey
    FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE
);

COMMIT;
