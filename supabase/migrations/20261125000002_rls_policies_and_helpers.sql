-- Haziri.AI Migration 0002: Least-Privilege RLS Policies, Zero-Service-Role Auth RPCs & Transactional Attendance RPC
-- IMPORTANT:
--   - Verify in staging with multi-teacher/multi-student test suite (`supabase/tests/rls_isolation_test.sql`).
--   - Legacy Streamlit app using anon keys without Supabase Auth sessions will be blocked once RLS is enabled;
--     apply to production ONLY during approved cutover.

BEGIN;

-- Needed for server-side legacy bcrypt verification inside PostgreSQL (zero service_role key required)
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- 1. Enable RLS on all exposed tables
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_face_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subject_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_logs ENABLE ROW LEVEL SECURITY;

-- Column-level safeguard: prevent direct PostgREST SELECT of legacy teacher password hashes
REVOKE SELECT (password) ON public.teachers FROM authenticated, anon;

-- ==============================================================================
-- 1. SECURITY DEFINER Helper Functions to Prevent Cross-Table RLS Infinite Recursion
-- Every cross-table check in RLS policies goes through these helpers (SET search_path = ''),
-- so NO RLS policy directly queries another RLS-protected table. This mathematically
-- eliminates PostgreSQL 42P17 infinite recursion across all 7 tables.
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.get_current_teacher_id()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT t.id
  FROM public.teachers t
  WHERE t.auth_user_id = (SELECT auth.uid())
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_current_student_id()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT s.id
  FROM public.students s
  WHERE s.auth_user_id = (SELECT auth.uid())
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_teacher_of_subject(p_subject_id bigint)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.subjects sub
    JOIN public.teachers t ON t.id = sub.teacher_id
    WHERE sub.id = p_subject_id
      AND t.auth_user_id = (SELECT auth.uid())
  );
$$;

CREATE OR REPLACE FUNCTION public.is_student_enrolled_in_subject(p_subject_id bigint)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.subject_students ss
    JOIN public.students s ON s.id = ss.student_id
    WHERE ss.subject_id = p_subject_id
      AND s.auth_user_id = (SELECT auth.uid())
  );
$$;

CREATE OR REPLACE FUNCTION public.is_teacher_of_student(p_student_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.subject_students ss
    JOIN public.subjects sub ON sub.id = ss.subject_id
    JOIN public.teachers t ON t.id = sub.teacher_id
    WHERE ss.student_id = p_student_id
      AND t.auth_user_id = (SELECT auth.uid())
  );
$$;

CREATE OR REPLACE FUNCTION public.can_teacher_log_attendance(
  p_subject_id bigint,
  p_student_id text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.subjects sub
    JOIN public.teachers t ON t.id = sub.teacher_id
    JOIN public.subject_students ss ON ss.subject_id = sub.id
    WHERE sub.id = p_subject_id
      AND ss.student_id = p_student_id
      AND t.auth_user_id = (SELECT auth.uid())
  );
$$;

CREATE OR REPLACE FUNCTION public.is_own_face_template(p_template_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT p_template_id IS NULL OR EXISTS (
    SELECT 1
    FROM public.student_face_templates t
    JOIN public.students s ON s.id = t.student_id
    WHERE t.id = p_template_id
      AND s.auth_user_id = (SELECT auth.uid())
  );
$$;

REVOKE ALL ON FUNCTION public.get_current_teacher_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_current_teacher_id() TO authenticated;

REVOKE ALL ON FUNCTION public.get_current_student_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_current_student_id() TO authenticated;

REVOKE ALL ON FUNCTION public.is_teacher_of_subject(bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_teacher_of_subject(bigint) TO authenticated;

REVOKE ALL ON FUNCTION public.is_student_enrolled_in_subject(bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_student_enrolled_in_subject(bigint) TO authenticated;

REVOKE ALL ON FUNCTION public.is_teacher_of_student(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_teacher_of_student(text) TO authenticated;

REVOKE ALL ON FUNCTION public.can_teacher_log_attendance(bigint, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_teacher_log_attendance(bigint, text) TO authenticated;

REVOKE ALL ON FUNCTION public.is_own_face_template(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_own_face_template(uuid) TO authenticated;

-- 2. TEACHERS policies (self read/insert/update only)
DROP POLICY IF EXISTS teachers_select_own ON public.teachers;
CREATE POLICY teachers_select_own
  ON public.teachers
  FOR SELECT
  TO authenticated
  USING (auth_user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS teachers_insert_own ON public.teachers;
CREATE POLICY teachers_insert_own
  ON public.teachers
  FOR INSERT
  TO authenticated
  WITH CHECK (auth_user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS teachers_update_own ON public.teachers;
CREATE POLICY teachers_update_own
  ON public.teachers
  FOR UPDATE
  TO authenticated
  USING (auth_user_id = (SELECT auth.uid()))
  WITH CHECK (auth_user_id = (SELECT auth.uid()));

-- 3. STUDENTS policies (student reads/updates self; teacher reads enrolled students)
DROP POLICY IF EXISTS students_select_own ON public.students;
CREATE POLICY students_select_own
  ON public.students
  FOR SELECT
  TO authenticated
  USING (auth_user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS students_select_enrolled_for_teacher ON public.students;
CREATE POLICY students_select_enrolled_for_teacher
  ON public.students
  FOR SELECT
  TO authenticated
  USING (public.is_teacher_of_student(id));

DROP POLICY IF EXISTS students_insert_own ON public.students;
CREATE POLICY students_insert_own
  ON public.students
  FOR INSERT
  TO authenticated
  WITH CHECK (auth_user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS students_update_own ON public.students;
CREATE POLICY students_update_own
  ON public.students
  FOR UPDATE
  TO authenticated
  USING (auth_user_id = (SELECT auth.uid()))
  WITH CHECK (
    auth_user_id = (SELECT auth.uid())
    AND public.is_own_face_template(active_face_template_id)
  );

-- 4. STUDENT_FACE_TEMPLATES policies
DROP POLICY IF EXISTS face_templates_select_own ON public.student_face_templates;
CREATE POLICY face_templates_select_own
  ON public.student_face_templates
  FOR SELECT
  TO authenticated
  USING (student_id = public.get_current_student_id());

DROP POLICY IF EXISTS face_templates_select_enrolled_for_teacher ON public.student_face_templates;
CREATE POLICY face_templates_select_enrolled_for_teacher
  ON public.student_face_templates
  FOR SELECT
  TO authenticated
  USING (
    is_active = true
    AND public.is_teacher_of_student(student_id)
  );

DROP POLICY IF EXISTS face_templates_insert_own ON public.student_face_templates;
CREATE POLICY face_templates_insert_own
  ON public.student_face_templates
  FOR INSERT
  TO authenticated
  WITH CHECK (student_id = public.get_current_student_id());

DROP POLICY IF EXISTS face_templates_update_own ON public.student_face_templates;
CREATE POLICY face_templates_update_own
  ON public.student_face_templates
  FOR UPDATE
  TO authenticated
  USING (student_id = public.get_current_student_id())
  WITH CHECK (student_id = public.get_current_student_id());

-- 5. SUBJECTS policies (teacher CRUD own; student SELECT enrolled subjects — zero cycle)
DROP POLICY IF EXISTS subjects_teacher_all ON public.subjects;
CREATE POLICY subjects_teacher_all
  ON public.subjects
  FOR ALL
  TO authenticated
  USING (teacher_id = public.get_current_teacher_id())
  WITH CHECK (teacher_id = public.get_current_teacher_id());

DROP POLICY IF EXISTS subjects_student_select_enrolled ON public.subjects;
CREATE POLICY subjects_student_select_enrolled
  ON public.subjects
  FOR SELECT
  TO authenticated
  USING (public.is_student_enrolled_in_subject(id));

-- 6. SUBJECT_STUDENTS policies (zero cycle with subjects)
DROP POLICY IF EXISTS subject_students_student_select ON public.subject_students;
CREATE POLICY subject_students_student_select
  ON public.subject_students
  FOR SELECT
  TO authenticated
  USING (student_id = public.get_current_student_id());

DROP POLICY IF EXISTS subject_students_student_insert ON public.subject_students;
CREATE POLICY subject_students_student_insert
  ON public.subject_students
  FOR INSERT
  TO authenticated
  WITH CHECK (student_id = public.get_current_student_id());

DROP POLICY IF EXISTS subject_students_student_delete ON public.subject_students;
CREATE POLICY subject_students_student_delete
  ON public.subject_students
  FOR DELETE
  TO authenticated
  USING (student_id = public.get_current_student_id());

DROP POLICY IF EXISTS subject_students_teacher_select ON public.subject_students;
CREATE POLICY subject_students_teacher_select
  ON public.subject_students
  FOR SELECT
  TO authenticated
  USING (public.is_teacher_of_subject(subject_id));

-- 7. ATTENDANCE_SESSIONS policies
DROP POLICY IF EXISTS attendance_sessions_teacher_select ON public.attendance_sessions;
CREATE POLICY attendance_sessions_teacher_select
  ON public.attendance_sessions
  FOR SELECT
  TO authenticated
  USING (
    teacher_id = public.get_current_teacher_id()
    AND public.is_teacher_of_subject(subject_id)
  );

DROP POLICY IF EXISTS attendance_sessions_teacher_insert ON public.attendance_sessions;
CREATE POLICY attendance_sessions_teacher_insert
  ON public.attendance_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    teacher_id = public.get_current_teacher_id()
    AND public.is_teacher_of_subject(subject_id)
  );

DROP POLICY IF EXISTS attendance_sessions_student_select ON public.attendance_sessions;
CREATE POLICY attendance_sessions_student_select
  ON public.attendance_sessions
  FOR SELECT
  TO authenticated
  USING (public.is_student_enrolled_in_subject(subject_id));

-- 8. ATTENDANCE_LOGS policies
DROP POLICY IF EXISTS attendance_logs_teacher_select ON public.attendance_logs;
CREATE POLICY attendance_logs_teacher_select
  ON public.attendance_logs
  FOR SELECT
  TO authenticated
  USING (public.is_teacher_of_subject(subject_id));

DROP POLICY IF EXISTS attendance_logs_teacher_insert ON public.attendance_logs;
CREATE POLICY attendance_logs_teacher_insert
  ON public.attendance_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (public.can_teacher_log_attendance(subject_id, student_id));

DROP POLICY IF EXISTS attendance_logs_student_select ON public.attendance_logs;
CREATE POLICY attendance_logs_student_select
  ON public.attendance_logs
  FOR SELECT
  TO authenticated
  USING (student_id = public.get_current_student_id());

-- 9. Narrow Registration Duplicate-Check RPC (zero PII exposed; replaces admin table scan)
CREATE OR REPLACE FUNCTION public.check_registration_conflicts(
  p_role text,
  p_id text,
  p_email text,
  p_mobile text
)
RETURNS TABLE (
  id_taken boolean,
  email_taken boolean,
  mobile_taken boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_id text := upper(trim(p_id));
  v_email text := lower(trim(p_email));
  v_mobile text := trim(p_mobile);
BEGIN
  IF p_role = 'teacher' THEN
    RETURN QUERY
      SELECT
        EXISTS (SELECT 1 FROM public.teachers t WHERE upper(t.id) = v_id),
        EXISTS (SELECT 1 FROM public.teachers t WHERE lower(t.email_id) = v_email),
        EXISTS (SELECT 1 FROM public.teachers t WHERE t.mobile_number = v_mobile);
    RETURN;
  ELSIF p_role = 'student' THEN
    RETURN QUERY
      SELECT
        EXISTS (SELECT 1 FROM public.students s WHERE upper(s.id) = v_id),
        EXISTS (SELECT 1 FROM public.students s WHERE lower(s.email_id) = v_email),
        EXISTS (SELECT 1 FROM public.students s WHERE s.mobile_number = v_mobile);
    RETURN;
  END IF;

  RAISE EXCEPTION 'Invalid role % for conflict check', p_role;
END;
$$;

REVOKE ALL ON FUNCTION public.check_registration_conflicts(text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_registration_conflicts(text, text, text, text) TO anon, authenticated;

-- 10. Narrow Login Identifier Lookup RPC (resolves T#### / S#### to email without exposing profile PII)
CREATE OR REPLACE FUNCTION public.resolve_login_identifier(
  p_role text,
  p_identifier text
)
RETURNS TABLE (
  email_id text,
  is_linked boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_ident text := trim(p_identifier);
BEGIN
  IF p_role = 'teacher' THEN
    RETURN QUERY
      SELECT t.email_id, (t.auth_user_id IS NOT NULL)
      FROM public.teachers t
      WHERE upper(t.id) = upper(v_ident)
         OR lower(t.email_id) = lower(v_ident)
      LIMIT 1;
    RETURN;
  ELSIF p_role = 'student' THEN
    RETURN QUERY
      SELECT s.email_id, (s.auth_user_id IS NOT NULL)
      FROM public.students s
      WHERE upper(s.id) = upper(v_ident)
         OR lower(s.email_id) = lower(v_ident)
      LIMIT 1;
    RETURN;
  END IF;

  RAISE EXCEPTION 'Invalid role % for identifier lookup', p_role;
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_login_identifier(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_login_identifier(text, text) TO anon, authenticated;

-- 11. Server-Side Legacy Bcrypt Verification Inside PostgreSQL (hash never leaves DB)
CREATE OR REPLACE FUNCTION public.verify_legacy_teacher_password(
  p_identifier text,
  p_password text
)
RETURNS TABLE (
  verified boolean,
  teacher_id text,
  email_id text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_ident text := trim(p_identifier);
  v_row record;
BEGIN
  SELECT t.id, t.email_id, t.password
  INTO v_row
  FROM public.teachers t
  WHERE (upper(t.id) = upper(v_ident) OR lower(t.email_id) = lower(v_ident))
    AND t.auth_user_id IS NULL
  LIMIT 1;

  IF NOT FOUND OR v_row.password IS NULL THEN
    RETURN QUERY SELECT false, NULL::text, NULL::text;
    RETURN;
  END IF;

  IF extensions.crypt(p_password, v_row.password) = v_row.password THEN
    RETURN QUERY SELECT true, v_row.id, v_row.email_id;
    RETURN;
  END IF;

  RETURN QUERY SELECT false, NULL::text, NULL::text;
END;
$$;

REVOKE ALL ON FUNCTION public.verify_legacy_teacher_password(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_legacy_teacher_password(text, text) TO anon, authenticated;

-- 12. Authenticated Email-Verified Legacy Profile Claim RPC
-- Requires email_confirmed_at IS NOT NULL so unconfirmed signups cannot hijack an existing profile.
CREATE OR REPLACE FUNCTION public.claim_legacy_profile(
  p_role text
)
RETURNS TABLE (
  linked boolean,
  profile_id text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := (SELECT auth.uid());
  v_email text;
  v_confirmed timestamptz;
  v_existing_id text;
  v_claimed_id text;
BEGIN
  IF v_uid IS NULL THEN
    RETURN QUERY SELECT false, NULL::text;
    RETURN;
  END IF;

  SELECT u.email, u.email_confirmed_at
  INTO v_email, v_confirmed
  FROM auth.users u
  WHERE u.id = v_uid
  LIMIT 1;

  IF v_email IS NULL OR v_confirmed IS NULL THEN
    RETURN QUERY SELECT false, NULL::text;
    RETURN;
  END IF;

  IF p_role = 'teacher' THEN
    SELECT t.id INTO v_existing_id
    FROM public.teachers t
    WHERE t.auth_user_id = v_uid
    LIMIT 1;

    IF v_existing_id IS NOT NULL THEN
      RETURN QUERY SELECT true, v_existing_id;
      RETURN;
    END IF;

    UPDATE public.teachers t
    SET auth_user_id = v_uid
    WHERE lower(t.email_id) = lower(v_email)
      AND t.auth_user_id IS NULL
    RETURNING t.id INTO v_claimed_id;

    IF v_claimed_id IS NOT NULL THEN
      RETURN QUERY SELECT true, v_claimed_id;
      RETURN;
    END IF;

    RETURN QUERY SELECT false, NULL::text;
    RETURN;
  ELSIF p_role = 'student' THEN
    SELECT s.id INTO v_existing_id
    FROM public.students s
    WHERE s.auth_user_id = v_uid
    LIMIT 1;

    IF v_existing_id IS NOT NULL THEN
      RETURN QUERY SELECT true, v_existing_id;
      RETURN;
    END IF;

    UPDATE public.students s
    SET auth_user_id = v_uid
    WHERE lower(s.email_id) = lower(v_email)
      AND s.auth_user_id IS NULL
    RETURNING s.id INTO v_claimed_id;

    IF v_claimed_id IS NOT NULL THEN
      RETURN QUERY SELECT true, v_claimed_id;
      RETURN;
    END IF;

    RETURN QUERY SELECT false, NULL::text;
    RETURN;
  END IF;

  RAISE EXCEPTION 'Invalid role % for claim_legacy_profile', p_role;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_legacy_profile(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_legacy_profile(text) TO authenticated;

-- 13. Narrow Subject Lookup RPC for Authenticated Student Join Flows (never exposes teacher_id or all subjects)
CREATE OR REPLACE FUNCTION public.lookup_subject_by_code(p_code text)
RETURNS TABLE (
  id bigint,
  code text,
  name text,
  section text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT s.id, s.code, s.name, s.section
  FROM public.subjects s
  WHERE upper(trim(s.code)) = upper(trim(p_code))
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.lookup_subject_by_code(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lookup_subject_by_code(text) TO authenticated;

-- 14. Transactional, Concurrency-Safe Idempotent Attendance Save RPC (SECURITY INVOKER — RLS enforced)
CREATE OR REPLACE FUNCTION public.save_attendance_session(
  p_subject_id bigint,
  p_idempotency_key uuid,
  p_photo_count integer,
  p_entries jsonb
)
RETURNS TABLE (
  session_id uuid,
  inserted_count integer,
  deduplicated boolean,
  recorded_at timestamptz
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
#variable_conflict use_column
DECLARE
  v_teacher_id text;
  v_session_id uuid;
  v_recorded_at timestamptz := date_trunc('second', now());
  v_existing_id uuid;
  v_existing_ts timestamptz;
  v_inserted_count integer := 0;
  v_invalid_count integer := 0;
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF jsonb_typeof(p_entries) <> 'array' OR jsonb_array_length(p_entries) = 0 THEN
    RAISE EXCEPTION 'Attendance entries must be a non-empty JSON array';
  END IF;

  SELECT t.id INTO v_teacher_id
  FROM public.teachers t
  JOIN public.subjects sub ON sub.teacher_id = t.id
  WHERE sub.id = p_subject_id
    AND t.auth_user_id = (SELECT auth.uid())
  LIMIT 1;

  IF v_teacher_id IS NULL THEN
    RAISE EXCEPTION 'Subject not found or not owned by authenticated teacher';
  END IF;

  SELECT s.id, s.recorded_at INTO v_existing_id, v_existing_ts
  FROM public.attendance_sessions s
  WHERE s.idempotency_key = p_idempotency_key
    AND s.subject_id = p_subject_id
    AND s.teacher_id = v_teacher_id
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    RETURN QUERY
      SELECT v_existing_id,
             (SELECT count(*)::integer FROM public.attendance_logs al WHERE al.session_id = v_existing_id),
             true,
             v_existing_ts;
    RETURN;
  END IF;

  -- Verify every submitted student is enrolled in the target subject
  SELECT count(*) INTO v_invalid_count
  FROM jsonb_to_recordset(p_entries) AS x(student_id text, is_present boolean, source_photos text[], is_manual_override boolean)
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.subject_students ss
    WHERE ss.subject_id = p_subject_id
      AND ss.student_id = x.student_id
  );

  IF v_invalid_count > 0 THEN
    RAISE EXCEPTION 'One or more students are not enrolled in subject %', p_subject_id;
  END IF;

  INSERT INTO public.attendance_sessions (subject_id, teacher_id, idempotency_key, recorded_at, photo_count)
  VALUES (p_subject_id, v_teacher_id, p_idempotency_key, v_recorded_at, GREATEST(p_photo_count, 0))
  ON CONFLICT (idempotency_key) DO NOTHING
  RETURNING id INTO v_session_id;

  IF v_session_id IS NULL THEN
    SELECT s.id, s.recorded_at INTO v_existing_id, v_existing_ts
    FROM public.attendance_sessions s
    WHERE s.idempotency_key = p_idempotency_key
      AND s.subject_id = p_subject_id
      AND s.teacher_id = v_teacher_id
    LIMIT 1;

    IF v_existing_id IS NULL THEN
      RAISE EXCEPTION 'Idempotency key conflict for another subject or teacher';
    END IF;

    RETURN QUERY
      SELECT v_existing_id,
             (SELECT count(*)::integer FROM public.attendance_logs al WHERE al.session_id = v_existing_id),
             true,
             v_existing_ts;
    RETURN;
  END IF;

  INSERT INTO public.attendance_logs (
    "timestamp",
    subject_id,
    student_id,
    is_present,
    session_id,
    source_photos,
    is_manual_override
  )
  SELECT
    v_recorded_at,
    p_subject_id,
    x.student_id,
    COALESCE(x.is_present, false),
    v_session_id,
    COALESCE(x.source_photos, '{}'::text[]),
    COALESCE(x.is_manual_override, false)
  FROM jsonb_to_recordset(p_entries) AS x(
    student_id text,
    is_present boolean,
    source_photos text[],
    is_manual_override boolean
  )
  ON CONFLICT (session_id, student_id) WHERE session_id IS NOT NULL DO NOTHING;

  GET DIAGNOSTICS v_inserted_count = ROW_COUNT;

  RETURN QUERY SELECT v_session_id, v_inserted_count, false, v_recorded_at;
END;
$$;

REVOKE ALL ON FUNCTION public.save_attendance_session(bigint, uuid, integer, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_attendance_session(bigint, uuid, integer, jsonb) TO authenticated;

-- ==============================================================================
-- 15. Automatic Profile Synchronization Trigger on auth.users Signup
-- Ensures public.teachers or public.students profile row is created IMMEDIATELY
-- upon signup, whether email confirmation is required or not.
-- Security: never links an existing legacy profile unless email is already confirmed
-- and email matches (prevents unconfirmed pre-hijack via client-supplied profile_id).
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_role text;
  v_name text;
  v_mobile text;
  v_gender text;
  v_profile_id text;
  v_age integer;
  v_legacy_count integer := 0;
BEGIN
  IF new.email IS NULL THEN
    RETURN new;
  END IF;

  v_role := new.raw_user_meta_data->>'role';
  v_name := COALESCE(NULLIF(trim(new.raw_user_meta_data->>'name'), ''), split_part(new.email, '@', 1));
  v_mobile := COALESCE(NULLIF(trim(new.raw_user_meta_data->>'mobile_number'), ''), '0000000000');
  v_gender := COALESCE(NULLIF(trim(new.raw_user_meta_data->>'gender'), ''), 'other');
  v_profile_id := NULLIF(trim(new.raw_user_meta_data->>'profile_id'), '');

  IF v_role = 'teacher' THEN
    -- Only auto-link a legacy unlinked profile when email is already confirmed
    IF new.email_confirmed_at IS NOT NULL THEN
      UPDATE public.teachers
      SET auth_user_id = new.id
      WHERE auth_user_id IS NULL
        AND lower(email_id) = lower(new.email);

      GET DIAGNOSTICS v_legacy_count = ROW_COUNT;
    END IF;

    IF v_legacy_count = 0 THEN
      IF v_profile_id IS NULL THEN
        v_profile_id := 'T' || lpad(floor(random() * 9000 + 1000)::text, 4, '0');
      END IF;

      INSERT INTO public.teachers (
        id, name, email_id, mobile_number, gender, password, auth_user_id
      )
      VALUES (
        v_profile_id,
        lower(v_name),
        lower(new.email),
        v_mobile,
        v_gender,
        'supabase-auth-managed',
        new.id
      )
      ON CONFLICT DO NOTHING;
    END IF;

  ELSIF v_role = 'student' THEN
    -- Only auto-link a legacy unlinked profile when email is already confirmed
    IF new.email_confirmed_at IS NOT NULL THEN
      UPDATE public.students
      SET auth_user_id = new.id
      WHERE auth_user_id IS NULL
        AND lower(email_id) = lower(new.email);

      GET DIAGNOSTICS v_legacy_count = ROW_COUNT;
    END IF;

    IF v_legacy_count = 0 THEN
      IF v_profile_id IS NULL THEN
        v_profile_id := 'S' || lpad(floor(random() * 9000 + 1000)::text, 4, '0');
      END IF;

      v_age := COALESCE((new.raw_user_meta_data->>'age')::integer, 20);

      INSERT INTO public.students (
        id, name, email_id, mobile_number, age, gender, auth_user_id
      )
      VALUES (
        v_profile_id,
        lower(v_name),
        lower(new.email),
        v_mobile,
        v_age,
        v_gender,
        new.id
      )
      ON CONFLICT DO NOTHING;

      -- If join_class_code was provided during registration, enroll immediately into subject_students
      IF new.raw_user_meta_data ? 'join_class_code'
         AND length(trim(new.raw_user_meta_data->>'join_class_code')) > 0 THEN
        INSERT INTO public.subject_students (subject_id, student_id)
        SELECT s.id, v_profile_id
        FROM public.subjects s
        WHERE upper(s.code) = upper(trim(new.raw_user_meta_data->>'join_class_code'))
          AND EXISTS (
            SELECT 1 FROM public.students st
            WHERE st.id = v_profile_id AND st.auth_user_id = new.id
          )
        ON CONFLICT (subject_id, student_id) DO NOTHING;
      END IF;
    END IF;
  END IF;

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- ==============================================================================
-- 16. Server-Side Student Face Verification RPC for Face-Verified Email OTP / Magic Link Login
-- Zero SUPABASE_SERVICE_ROLE_KEY required; zero stored templates ever leave PostgreSQL.
-- Security invariants:
--   - Rejects malformed/non-finite/zero-norm probe vectors.
--   - Hard-clamps similarity threshold >= 0.363 (OpenCV SFace cosine default) so callers cannot weaken it.
--   - Requires matching model_id, model_version, preprocessing_version, and embedding_dimension.
--   - Requires linked Supabase Auth identity (auth_user_id IS NOT NULL).
--   - On any failure/mismatch, NEVER leaks stored vectors, email_id, or numeric similarity score.
--   - On match, returns email_id strictly so Next.js server can call supabase.auth.signInWithOtp(shouldCreateUser: false).
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.verify_student_face_for_otp(
  p_identifier text,
  p_model_id text,
  p_model_version text,
  p_preprocessing_version text,
  p_embedding_dimension integer,
  p_probe_vector double precision[],
  p_min_similarity double precision DEFAULT 0.363
)
RETURNS TABLE (
  verified boolean,
  student_id text,
  email_id text,
  reason text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_ident text := trim(COALESCE(p_identifier, ''));
  v_threshold double precision := GREATEST(COALESCE(p_min_similarity, 0.363), 0.363);
  v_student record;
  v_tpl record;
  v_probe_len integer;
  v_has_invalid boolean := false;
  v_dot double precision := 0;
  v_probe_norm double precision := 0;
  v_tpl_norm double precision := 0;
  v_similarity double precision := 0;
  v_best_similarity double precision := -2;
  v_found_template boolean := false;
BEGIN
  IF length(v_ident) < 3
     OR p_embedding_dimension IS NULL
     OR p_embedding_dimension <= 0
     OR p_embedding_dimension > 2048
     OR p_probe_vector IS NULL THEN
    RETURN QUERY SELECT false, NULL::text, NULL::text, 'invalid_input'::text;
    RETURN;
  END IF;

  v_probe_len := array_length(p_probe_vector, 1);
  IF v_probe_len IS NULL OR v_probe_len <> p_embedding_dimension THEN
    RETURN QUERY SELECT false, NULL::text, NULL::text, 'invalid_vector_length'::text;
    RETURN;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM unnest(p_probe_vector) AS v(val)
    WHERE val IS NULL
       OR val = 'NaN'::double precision
       OR val = 'Infinity'::double precision
       OR val = '-Infinity'::double precision
  )
  INTO v_has_invalid;

  IF v_has_invalid THEN
    RETURN QUERY SELECT false, NULL::text, NULL::text, 'invalid_vector_values'::text;
    RETURN;
  END IF;

  SELECT s.id, s.email_id, s.auth_user_id
  INTO v_student
  FROM public.students s
  WHERE upper(s.id) = upper(v_ident)
     OR lower(s.email_id) = lower(v_ident)
  LIMIT 1;

  IF v_student.id IS NULL THEN
    RETURN QUERY SELECT false, NULL::text, NULL::text, 'not_found'::text;
    RETURN;
  END IF;

  IF v_student.auth_user_id IS NULL THEN
    RETURN QUERY SELECT false, NULL::text, NULL::text, 'account_not_activated'::text;
    RETURN;
  END IF;

  FOR v_tpl IN
    SELECT t.vector
    FROM public.student_face_templates t
    WHERE t.student_id = v_student.id
      AND t.is_active = true
      AND t.model_id = p_model_id
      AND t.model_version = p_model_version
      AND t.preprocessing_version = p_preprocessing_version
      AND t.embedding_dimension = p_embedding_dimension
      AND jsonb_typeof(t.vector) = 'array'
      AND jsonb_array_length(t.vector) = p_embedding_dimension
  LOOP
    v_found_template := true;

    SELECT
      sum(p.probe_val * (el.tpl_text::double precision)),
      sqrt(sum(p.probe_val * p.probe_val)),
      sqrt(sum((el.tpl_text::double precision) * (el.tpl_text::double precision)))
    INTO v_dot, v_probe_norm, v_tpl_norm
    FROM unnest(p_probe_vector) WITH ORDINALITY AS p(probe_val, idx)
    JOIN jsonb_array_elements_text(v_tpl.vector) WITH ORDINALITY AS el(tpl_text, idx)
      ON p.idx = el.idx;

    IF v_probe_norm IS NOT NULL AND v_tpl_norm IS NOT NULL
       AND v_probe_norm > 1e-12 AND v_tpl_norm > 1e-12 THEN
      v_similarity := v_dot / (v_probe_norm * v_tpl_norm);
      IF v_similarity > v_best_similarity THEN
        v_best_similarity := v_similarity;
      END IF;
    END IF;
  END LOOP;

  IF NOT v_found_template THEN
    RETURN QUERY SELECT false, NULL::text, NULL::text, 'no_face_template'::text;
    RETURN;
  END IF;

  IF v_best_similarity >= v_threshold THEN
    RETURN QUERY SELECT true, v_student.id, v_student.email_id, 'matched'::text;
    RETURN;
  END IF;

  RETURN QUERY SELECT false, NULL::text, NULL::text, 'face_mismatch'::text;
END;
$$;

REVOKE ALL ON FUNCTION public.verify_student_face_for_otp(text, text, text, text, integer, double precision[], double precision) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_student_face_for_otp(text, text, text, text, integer, double precision[], double precision) TO anon, authenticated;

-- ==============================================================================
-- 17. Auto-Sync Trigger: public.student_face_templates -> public.students.active_face_template_id
-- Keeps students.active_face_template_id automatically pointing to the student's
-- active template row on every INSERT / UPDATE / DELETE, and backfills existing rows.
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.sync_student_active_face_template()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_target_student_id text;
  v_latest_active_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_target_student_id := OLD.student_id;
  ELSE
    v_target_student_id := NEW.student_id;
  END IF;

  IF TG_OP IN ('INSERT', 'UPDATE') AND NEW.is_active THEN
    UPDATE public.students
    SET active_face_template_id = NEW.id
    WHERE id = v_target_student_id;
  ELSE
    SELECT t.id
    INTO v_latest_active_id
    FROM public.student_face_templates t
    WHERE t.student_id = v_target_student_id
      AND t.is_active = true
    ORDER BY t.updated_at DESC, t.created_at DESC
    LIMIT 1;

    UPDATE public.students
    SET active_face_template_id = v_latest_active_id
    WHERE id = v_target_student_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS on_student_face_template_change ON public.student_face_templates;
CREATE TRIGGER on_student_face_template_change
  AFTER INSERT OR UPDATE OR DELETE ON public.student_face_templates
  FOR EACH ROW EXECUTE FUNCTION public.sync_student_active_face_template();

-- Idempotent backfill for existing students who already have an active face template
UPDATE public.students s
SET active_face_template_id = latest.id
FROM (
  SELECT DISTINCT ON (t.student_id)
    t.student_id,
    t.id
  FROM public.student_face_templates t
  WHERE t.is_active = true
  ORDER BY t.student_id, t.updated_at DESC, t.created_at DESC
) AS latest
WHERE s.id = latest.student_id
  AND s.active_face_template_id IS DISTINCT FROM latest.id;

COMMIT;
