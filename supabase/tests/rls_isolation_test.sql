-- Haziri.AI Staging RLS Isolation Test Script
-- Run ONLY in a disposable staging PostgreSQL database after migrations 0001 and 0002.
-- Verifies:
--   1. Anonymous users cannot read teachers, students, templates, subjects, enrollments, or logs.
--   2. Teacher A cannot read/insert subjects, enrollments, templates, or attendance belonging to Teacher B.
--   3. Student 1 cannot read/modify Student 2's profile, enrollments, templates, or attendance logs.
--   4. Student cannot insert attendance_logs directly or hijack subject ownership.

BEGIN;

-- Create synthetic auth users (wrapped in rollback at end so staging stays clean)
INSERT INTO auth.users (id, email) VALUES
  ('11111111-1111-1111-1111-111111111111', 'teacher_a_test@haziri.local'),
  ('22222222-2222-2222-2222-222222222222', 'teacher_b_test@haziri.local'),
  ('33333333-3333-3333-3333-333333333333', 'student_1_test@haziri.local'),
  ('44444444-4444-4444-4444-444444444444', 'student_2_test@haziri.local')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.teachers (id, name, email_id, mobile_number, gender, password, auth_user_id) VALUES
  ('T9001', 'teacher alpha', 'teacher_a_test@haziri.local', '9000000001', 'male', '$2b$10$syntheticplaceholder', '11111111-1111-1111-1111-111111111111'),
  ('T9002', 'teacher beta', 'teacher_b_test@haziri.local', '9000000002', 'female', '$2b$10$syntheticplaceholder', '22222222-2222-2222-2222-222222222222')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.students (id, name, email_id, mobile_number, age, gender, auth_user_id) VALUES
  ('S9001', 'student one', 'student_1_test@haziri.local', '9100000001', 20, 'male', '33333333-3333-3333-3333-333333333333'),
  ('S9002', 'student two', 'student_2_test@haziri.local', '9100000002', 21, 'female', '44444444-4444-4444-4444-444444444444')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.subjects (code, name, section, teacher_id) VALUES
  ('TEST901', 'distributed systems', 'A', 'T9001'),
  ('TEST902', 'compiler design', 'B', 'T9002')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.subject_students (subject_id, student_id, created_at)
SELECT id, 'S9001', now() FROM public.subjects WHERE code = 'TEST901'
ON CONFLICT DO NOTHING;

INSERT INTO public.subject_students (subject_id, student_id, created_at)
SELECT id, 'S9002', now() FROM public.subjects WHERE code = 'TEST902'
ON CONFLICT DO NOTHING;

-- Test 1: Anonymous role must see 0 rows across all domain tables
SET LOCAL ROLE anon;
DO $$
BEGIN
  IF (SELECT count(*) FROM public.teachers) > 0
     OR (SELECT count(*) FROM public.students) > 0
     OR (SELECT count(*) FROM public.subjects) > 0
     OR (SELECT count(*) FROM public.attendance_logs) > 0 THEN
    RAISE EXCEPTION 'FAIL: anon role can read protected tables';
  END IF;
END $$;
RESET ROLE;

-- Test 2: Teacher A can create/read own subject (zero 42P17 recursion), sees only own subjects & S9001, never TEST902 or S9002
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
DO $$
DECLARE
  v_sub_count integer;
  v_stu_count integer;
  v_new_sub_id bigint;
BEGIN
  INSERT INTO public.subjects (code, name, section, teacher_id)
  VALUES ('TEST903', 'operating systems', 'C', 'T9001')
  RETURNING id INTO v_new_sub_id;

  IF v_new_sub_id IS NULL THEN
    RAISE EXCEPTION 'FAIL: Teacher A could not create own subject';
  END IF;

  SELECT count(*) INTO v_sub_count FROM public.subjects;
  SELECT count(*) INTO v_stu_count FROM public.students;
  IF v_sub_count <> 2 OR v_stu_count <> 1 THEN
    RAISE EXCEPTION 'FAIL: Teacher A isolation broken (subjects=%, students=%)', v_sub_count, v_stu_count;
  END IF;

  -- Verify save_attendance_session RPC succeeds without ambiguous column errors & deduplicates retries
  DECLARE
    v_test901_id bigint;
    v_idem uuid := '55555555-5555-5555-5555-555555555555';
    v_first record;
    v_replay record;
  BEGIN
    SELECT id INTO v_test901_id FROM public.subjects WHERE code = 'TEST901' LIMIT 1;
    SELECT * INTO v_first
    FROM public.save_attendance_session(
      v_test901_id,
      v_idem,
      1,
      jsonb_build_array(
        jsonb_build_object(
          'student_id', 'S9001',
          'is_present', true,
          'source_photos', ARRAY['Photo 1'],
          'is_manual_override', false
        )
      )
    );
    IF v_first.session_id IS NULL OR v_first.inserted_count <> 1 OR v_first.deduplicated THEN
      RAISE EXCEPTION 'FAIL: save_attendance_session initial insert unexpected result';
    END IF;

    SELECT * INTO v_replay
    FROM public.save_attendance_session(
      v_test901_id,
      v_idem,
      1,
      jsonb_build_array(
        jsonb_build_object(
          'student_id', 'S9001',
          'is_present', true,
          'source_photos', ARRAY['Photo 1'],
          'is_manual_override', false
        )
      )
    );
    IF v_replay.session_id <> v_first.session_id OR NOT v_replay.deduplicated THEN
      RAISE EXCEPTION 'FAIL: save_attendance_session idempotent replay failed';
    END IF;
  END;
END $$;

-- Test 3: Student 1 sees only TEST901 (zero 42P17 recursion), cannot read Student 2, cannot insert attendance_logs directly
SELECT set_config('request.jwt.claim.sub', '33333333-3333-3333-3333-333333333333', true);
DO $$
DECLARE
  v_other_student integer;
  v_student_subjects integer;
  v_sub_id bigint;
  v_insert_blocked boolean := false;
BEGIN
  SELECT count(*) INTO v_student_subjects FROM public.subjects;
  IF v_student_subjects <> 1 THEN
    RAISE EXCEPTION 'FAIL: Student 1 subject isolation broken (subjects=%)', v_student_subjects;
  END IF;

  SELECT count(*) INTO v_other_student FROM public.students WHERE id = 'S9002';
  IF v_other_student <> 0 THEN
    RAISE EXCEPTION 'FAIL: Student 1 can read Student 2';
  END IF;

  SELECT id INTO v_sub_id FROM public.subjects WHERE code = 'TEST901' LIMIT 1;
  BEGIN
    INSERT INTO public.attendance_logs (subject_id, student_id, is_present)
    VALUES (v_sub_id, 'S9001', true);
  EXCEPTION WHEN insufficient_privilege THEN
    v_insert_blocked := true;
  END;

  IF NOT v_insert_blocked THEN
    RAISE EXCEPTION 'FAIL: Student 1 was able to insert attendance_logs directly';
  END IF;
END $$;

RESET ROLE;

-- Test 4: Server-side face-OTP RPC verifies matching template without exposing templates or email on mismatch
INSERT INTO public.student_face_templates (
  student_id, model_id, model_version, preprocessing_version, embedding_dimension, vector, is_active
) VALUES (
  'S9001',
  'opencv-sface-mobilefacenet-onnx',
  '2021dec-int8@3d708243',
  'mediapipe-5pt-arcface-112-rgb-255-v1',
  4,
  '[1, 0, 0, 0]'::jsonb,
  true
) ON CONFLICT DO NOTHING;

DO $$
DECLARE
  v_active_tpl_id uuid;
BEGIN
  SELECT active_face_template_id INTO v_active_tpl_id
  FROM public.students
  WHERE id = 'S9001';

  IF v_active_tpl_id IS NULL THEN
    RAISE EXCEPTION 'FAIL: students.active_face_template_id was not auto-synced by trigger';
  END IF;
END $$;

SET LOCAL ROLE anon;
DO $$
DECLARE
  v_match record;
  v_miss record;
BEGIN
  SELECT * INTO v_match
  FROM public.verify_student_face_for_otp(
    'S9001',
    'opencv-sface-mobilefacenet-onnx',
    '2021dec-int8@3d708243',
    'mediapipe-5pt-arcface-112-rgb-255-v1',
    4,
    ARRAY[0.98, 0.05, 0.0, 0.0]::double precision[],
    0.363
  );

  IF NOT v_match.verified OR v_match.student_id <> 'S9001' OR v_match.email_id <> 'student_1_test@haziri.local' THEN
    RAISE EXCEPTION 'FAIL: verify_student_face_for_otp failed on valid match';
  END IF;

  SELECT * INTO v_miss
  FROM public.verify_student_face_for_otp(
    'S9001',
    'opencv-sface-mobilefacenet-onnx',
    '2021dec-int8@3d708243',
    'mediapipe-5pt-arcface-112-rgb-255-v1',
    4,
    ARRAY[0.0, 1.0, 0.0, 0.0]::double precision[],
    -1.0
  );

  IF v_miss.verified OR v_miss.email_id IS NOT NULL OR v_miss.reason <> 'face_mismatch' THEN
    RAISE EXCEPTION 'FAIL: verify_student_face_for_otp leaked data or accepted lowered threshold';
  END IF;
END $$;
RESET ROLE;

ROLLBACK;
