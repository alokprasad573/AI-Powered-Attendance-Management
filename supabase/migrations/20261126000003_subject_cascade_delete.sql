-- Haziri.AI Migration 0003: Safe Cascading Subject Deletion & Teacher Delete RPC
-- Ensures pre-existing legacy databases enforce ON DELETE CASCADE on subject child tables
-- and provides an atomic, ownership-verified RPC for deleting a teacher-owned subject.

BEGIN;

-- 1. Ensure child foreign keys cascade cleanly when a teacher deletes a subject
ALTER TABLE public.subject_students
  DROP CONSTRAINT IF EXISTS subject_students_subject_id_fkey,
  ADD CONSTRAINT subject_students_subject_id_fkey
    FOREIGN KEY (subject_id) REFERENCES public.subjects(id) ON DELETE CASCADE;

ALTER TABLE public.attendance_logs
  DROP CONSTRAINT IF EXISTS attendance_logs_subject_id_fkey,
  ADD CONSTRAINT attendance_logs_subject_id_fkey
    FOREIGN KEY (subject_id) REFERENCES public.subjects(id) ON DELETE CASCADE;

ALTER TABLE public.attendance_sessions
  DROP CONSTRAINT IF EXISTS attendance_sessions_subject_id_fkey,
  ADD CONSTRAINT attendance_sessions_subject_id_fkey
    FOREIGN KEY (subject_id) REFERENCES public.subjects(id) ON DELETE CASCADE;

-- 2. Atomic Teacher-Owned Subject Deletion RPC (verifies auth.uid() ownership strictly)
CREATE OR REPLACE FUNCTION public.delete_teacher_subject(p_subject_id bigint)
RETURNS TABLE (
  deleted boolean,
  subject_id bigint,
  code text,
  name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_teacher_id text;
  v_subject record;
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT t.id INTO v_teacher_id
  FROM public.teachers t
  WHERE t.auth_user_id = (SELECT auth.uid())
  LIMIT 1;

  IF v_teacher_id IS NULL THEN
    RETURN QUERY SELECT false, NULL::bigint, NULL::text, NULL::text;
    RETURN;
  END IF;

  SELECT s.id, s.code, s.name INTO v_subject
  FROM public.subjects s
  WHERE s.id = p_subject_id
    AND s.teacher_id = v_teacher_id
  LIMIT 1;

  IF v_subject.id IS NULL THEN
    RETURN QUERY SELECT false, NULL::bigint, NULL::text, NULL::text;
    RETURN;
  END IF;

  DELETE FROM public.attendance_logs WHERE subject_id = v_subject.id;
  DELETE FROM public.attendance_sessions WHERE subject_id = v_subject.id;
  DELETE FROM public.subject_students WHERE subject_id = v_subject.id;
  DELETE FROM public.subjects WHERE id = v_subject.id AND teacher_id = v_teacher_id;

  RETURN QUERY SELECT true, v_subject.id, v_subject.code, v_subject.name;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_teacher_subject(bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_teacher_subject(bigint) TO authenticated;

COMMIT;
