-- Haziri.AI Migration 0001: Additive Auth Linkage, Versioned Biometrics, and Idempotent Attendance Sessions
-- IMPORTANT:
--   1. Test in a disposable/staging Supabase project before any production execution.
--   2. Do NOT apply to production while legacy Streamlit uses anon/publishable keys without cutover sign-off.
--   3. Preserves all 5 legacy tables, Teacher IDs (T####), Student IDs (S####), legacy dlib vectors, and historical attendance_logs.

BEGIN;

-- 1. Link Supabase Auth identities without replacing T#### / S#### primary keys
ALTER TABLE public.teachers
  ADD COLUMN IF NOT EXISTS auth_user_id uuid;

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS auth_user_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'teachers_auth_user_id_key'
      AND conrelid = 'public.teachers'::regclass
  ) THEN
    ALTER TABLE public.teachers
      ADD CONSTRAINT teachers_auth_user_id_key UNIQUE (auth_user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'teachers_auth_user_id_fkey'
      AND conrelid = 'public.teachers'::regclass
  ) THEN
    ALTER TABLE public.teachers
      ADD CONSTRAINT teachers_auth_user_id_fkey
      FOREIGN KEY (auth_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'students_auth_user_id_key'
      AND conrelid = 'public.students'::regclass
  ) THEN
    ALTER TABLE public.students
      ADD CONSTRAINT students_auth_user_id_key UNIQUE (auth_user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'students_auth_user_id_fkey'
      AND conrelid = 'public.students'::regclass
  ) THEN
    ALTER TABLE public.students
      ADD CONSTRAINT students_auth_user_id_fkey
      FOREIGN KEY (auth_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 2. Model-versioned, dimension-aware student biometric templates (legacy students.face_embeddings preserved untouched)
CREATE TABLE IF NOT EXISTS public.student_face_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id text NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  model_id text NOT NULL,
  model_version text NOT NULL,
  preprocessing_version text NOT NULL,
  embedding_dimension integer NOT NULL CHECK (embedding_dimension > 0),
  vector jsonb NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  consent_granted_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT student_face_templates_vector_is_array CHECK (jsonb_typeof(vector) = 'array'),
  CONSTRAINT student_face_templates_vector_len_matches CHECK (jsonb_array_length(vector) = embedding_dimension)
);

CREATE UNIQUE INDEX IF NOT EXISTS student_face_templates_one_active_per_model_idx
  ON public.student_face_templates (student_id, model_id)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS student_face_templates_student_active_idx
  ON public.student_face_templates (student_id)
  WHERE is_active = true;

-- 2b. Additive Foreign Key pointer from public.students -> active public.student_face_templates row
-- Keeps legacy students.face_embeddings (jsonb) untouched for Streamlit rollback safety.
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS active_face_template_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'students_active_face_template_id_fkey'
      AND conrelid = 'public.students'::regclass
  ) THEN
    ALTER TABLE public.students
      ADD CONSTRAINT students_active_face_template_id_fkey
      FOREIGN KEY (active_face_template_id)
      REFERENCES public.student_face_templates(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS students_active_face_template_id_idx
  ON public.students (active_face_template_id)
  WHERE active_face_template_id IS NOT NULL;

-- 3. Idempotent attendance sessions (allows multiple sessions per student/subject while blocking double-submit/retry duplicates)
CREATE TABLE IF NOT EXISTS public.attendance_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id bigint NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  teacher_id text NOT NULL REFERENCES public.teachers(id) ON DELETE RESTRICT,
  idempotency_key uuid NOT NULL UNIQUE,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  photo_count integer NOT NULL DEFAULT 0 CHECK (photo_count >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS attendance_sessions_subject_idx
  ON public.attendance_sessions (subject_id, recorded_at DESC);

CREATE INDEX IF NOT EXISTS attendance_sessions_teacher_idx
  ON public.attendance_sessions (teacher_id, recorded_at DESC);

-- 4. Additive session & audit columns on attendance_logs (existing rows stay intact with session_id = NULL)
ALTER TABLE public.attendance_logs
  ADD COLUMN IF NOT EXISTS session_id uuid;

ALTER TABLE public.attendance_logs
  ADD COLUMN IF NOT EXISTS source_photos text[] NOT NULL DEFAULT '{}'::text[];

ALTER TABLE public.attendance_logs
  ADD COLUMN IF NOT EXISTS is_manual_override boolean NOT NULL DEFAULT false;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'attendance_logs_session_id_fkey'
      AND conrelid = 'public.attendance_logs'::regclass
  ) THEN
    ALTER TABLE public.attendance_logs
      ADD CONSTRAINT attendance_logs_session_id_fkey
      FOREIGN KEY (session_id) REFERENCES public.attendance_sessions(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS attendance_logs_session_student_unique_idx
  ON public.attendance_logs (session_id, student_id)
  WHERE session_id IS NOT NULL;

-- 5. Query & RLS performance indexes on foreign keys and access predicates
CREATE INDEX IF NOT EXISTS subjects_teacher_id_idx
  ON public.subjects (teacher_id);

CREATE INDEX IF NOT EXISTS subject_students_student_id_idx
  ON public.subject_students (student_id);

CREATE INDEX IF NOT EXISTS attendance_logs_subject_ts_idx
  ON public.attendance_logs (subject_id, "timestamp" DESC);

CREATE INDEX IF NOT EXISTS attendance_logs_student_ts_idx
  ON public.attendance_logs (student_id, "timestamp" DESC);

COMMIT;

-- ROLLBACK REFERENCE (only run if reverting before data relies on these structures):
-- BEGIN;
-- DROP INDEX IF EXISTS public.attendance_logs_student_ts_idx;
-- DROP INDEX IF EXISTS public.attendance_logs_subject_ts_idx;
-- DROP INDEX IF EXISTS public.subject_students_student_id_idx;
-- DROP INDEX IF EXISTS public.subjects_teacher_id_idx;
-- DROP INDEX IF EXISTS public.attendance_logs_session_student_unique_idx;
-- ALTER TABLE public.attendance_logs DROP CONSTRAINT IF EXISTS attendance_logs_session_id_fkey;
-- ALTER TABLE public.attendance_logs DROP COLUMN IF EXISTS is_manual_override;
-- ALTER TABLE public.attendance_logs DROP COLUMN IF EXISTS source_photos;
-- ALTER TABLE public.attendance_logs DROP COLUMN IF EXISTS session_id;
-- DROP TABLE IF EXISTS public.attendance_sessions;
-- DROP INDEX IF EXISTS public.students_active_face_template_id_idx;
-- ALTER TABLE public.students DROP CONSTRAINT IF EXISTS students_active_face_template_id_fkey;
-- ALTER TABLE public.students DROP COLUMN IF EXISTS active_face_template_id;
-- DROP TABLE IF EXISTS public.student_face_templates;
-- ALTER TABLE public.students DROP CONSTRAINT IF EXISTS students_auth_user_id_fkey;
-- ALTER TABLE public.students DROP CONSTRAINT IF EXISTS students_auth_user_id_key;
-- ALTER TABLE public.students DROP COLUMN IF EXISTS auth_user_id;
-- ALTER TABLE public.teachers DROP CONSTRAINT IF EXISTS teachers_auth_user_id_fkey;
-- ALTER TABLE public.teachers DROP CONSTRAINT IF EXISTS teachers_auth_user_id_key;
-- ALTER TABLE public.teachers DROP COLUMN IF EXISTS auth_user_id;
-- COMMIT;
