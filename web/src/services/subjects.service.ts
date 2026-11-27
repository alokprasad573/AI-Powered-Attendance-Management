import "server-only";

import { formatDisplayName, normalizeSubjectInput } from "@/domain/ids";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ServiceResult } from "./auth.service";

export interface TeacherSubjectSummary {
  id: number;
  code: string;
  name: string;
  section: string;
  teacherId: string;
  totalStudents: number;
  totalSessions: number;
  totalClasses: number;
}

export interface LookupSubjectResult {
  id: number;
  code: string;
  name: string;
  section: string;
}

export async function listTeacherSubjects(
  teacherId: string
): Promise<TeacherSubjectSummary[]> {
  const supabase = await createServerSupabaseClient();

  // 1. Fetch subjects owned by this teacher
  const { data: subjects, error: subjErr } = await supabase
    .from("subjects")
    .select("id, code, name, section, teacher_id")
    .eq("teacher_id", teacherId)
    .order("created_at", { ascending: false });

  if (subjErr) {
    console.error("[listTeacherSubjects] Subjects query failed:", {
      teacherId,
      code: subjErr.code,
      message: subjErr.message,
    });
    throw new Error(`Failed to load subjects: ${subjErr.message}`);
  }

  if (!subjects || subjects.length === 0) {
    return [];
  }

  const subjectIds = subjects.map((s) => s.id);

  // 2. Fetch student enrollment counts & historical/session attendance logs in parallel
  const [{ data: enrollments }, { data: logs }] = await Promise.all([
    supabase
      .from("subject_students")
      .select("subject_id")
      .in("subject_id", subjectIds),
    supabase
      .from("attendance_logs")
      .select("subject_id, timestamp, session_id")
      .in("subject_id", subjectIds),
  ]);

  const studentCountMap = new Map<number, number>();
  if (Array.isArray(enrollments)) {
    for (const row of enrollments) {
      studentCountMap.set(
        row.subject_id,
        (studentCountMap.get(row.subject_id) ?? 0) + 1
      );
    }
  }

  // Count unique sessions preserving legacy attendance_logs (where session_id is NULL)
  const sessionKeySets = new Map<number, Set<string>>();
  if (Array.isArray(logs)) {
    for (const row of logs) {
      if (row.subject_id === null) continue;
      const key = row.session_id ?? row.timestamp;
      if (!key) continue;
      let keys = sessionKeySets.get(row.subject_id);
      if (!keys) {
        keys = new Set<string>();
        sessionKeySets.set(row.subject_id, keys);
      }
      keys.add(key);
    }
  }

  return subjects.map((sub) => {
    const totalStudents = studentCountMap.get(sub.id) ?? 0;
    const totalSessions = sessionKeySets.get(sub.id)?.size ?? 0;

    return {
      id: sub.id,
      code: sub.code,
      name: formatDisplayName(sub.name),
      section: sub.section.toUpperCase(),
      teacherId: sub.teacher_id ?? teacherId,
      totalStudents,
      totalSessions,
      totalClasses: totalSessions,
    };
  });
}

export async function createTeacherSubject(
  teacherId: string,
  input: { code: string; name: string; section: string }
): Promise<ServiceResult<TeacherSubjectSummary>> {
  const normalized = normalizeSubjectInput(input);
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("subjects")
    .insert({
      code: normalized.code,
      name: normalized.name,
      section: normalized.section,
      teacher_id: teacherId,
    })
    .select("id, code, name, section, teacher_id")
    .single();

  if (error || !data) {
    console.error("[createTeacherSubject] Insert error:", {
      teacherId,
      code: error?.code,
      message: error?.message,
      details: error?.details,
      hint: error?.hint,
    });
    const isDuplicate = error?.code === "23505";
    return {
      ok: false,
      status: isDuplicate ? 409 : 400,
      code: isDuplicate ? "SUBJECT_CODE_EXISTS" : "SUBJECT_CREATE_FAILED",
      message: isDuplicate
        ? `Subject code "${normalized.code}" already exists.`
        : error?.message || "Unable to create subject. Please verify your inputs.",
    };
  }

  return {
    ok: true,
    message: "Subject created successfully !",
    data: {
      id: data.id,
      code: data.code,
      name: formatDisplayName(data.name),
      section: data.section.toUpperCase(),
      teacherId: data.teacher_id ?? teacherId,
      totalStudents: 0,
      totalSessions: 0,
      totalClasses: 0,
    },
  };
}

export async function deleteTeacherSubject(
  teacherId: string,
  subjectId: number
): Promise<ServiceResult<{ id: number; code: string; name: string }>> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("subjects")
    .delete()
    .eq("id", subjectId)
    .eq("teacher_id", teacherId)
    .select("id, code, name")
    .maybeSingle();

  if (!error) {
    if (!data) {
      return {
        ok: false,
        status: 404,
        code: "SUBJECT_NOT_FOUND",
        message: "Subject not found or you do not have permission to delete it.",
      };
    }

    return {
      ok: true,
      message: `Subject "${formatDisplayName(data.name)}" (${data.code}) deleted successfully.`,
      data: {
        id: data.id,
        code: data.code,
        name: formatDisplayName(data.name),
      },
    };
  }

  // Fallback for pre-existing databases whose legacy foreign keys lack ON DELETE CASCADE
  if (error.code === "23503") {
    const { data: rpcRows, error: rpcErr } = await supabase.rpc(
      "delete_teacher_subject",
      {
        p_subject_id: subjectId,
      }
    );

    const row = rpcRows?.[0];
    if (!rpcErr && row?.deleted && row.subject_id && row.code && row.name) {
      return {
        ok: true,
        message: `Subject "${formatDisplayName(row.name)}" (${row.code}) deleted successfully.`,
        data: {
          id: row.subject_id,
          code: row.code,
          name: formatDisplayName(row.name),
        },
      };
    }

    if (!rpcErr && row && !row.deleted) {
      return {
        ok: false,
        status: 404,
        code: "SUBJECT_NOT_FOUND",
        message: "Subject not found or you do not have permission to delete it.",
      };
    }

    return {
      ok: false,
      status: 409,
      code: "SUBJECT_HAS_DEPENDENCIES",
      message:
        "This subject has linked student enrollments or attendance records and your database foreign keys do not have ON DELETE CASCADE yet. Run supabase/migrations/20261126000003_subject_cascade_delete.sql in the Supabase SQL Editor.",
    };
  }

  console.error("[deleteTeacherSubject] Delete error:", {
    teacherId,
    subjectId,
    code: error.code,
    message: error.message,
  });

  return {
    ok: false,
    status: 400,
    code: "SUBJECT_DELETE_FAILED",
    message: "Unable to delete subject right now. Please try again.",
  };
}

export async function lookupSubjectByCodeForStudent(
  code: string
): Promise<LookupSubjectResult | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("lookup_subject_by_code", {
    p_code: code.trim(),
  });

  if (error || !data || data.length === 0) {
    return null;
  }

  const row = data[0];
  if (!row) return null;

  return {
    id: row.id,
    code: row.code,
    name: formatDisplayName(row.name),
    section: row.section.toUpperCase(),
  };
}

export async function enrollStudentByCode(
  studentId: string,
  code: string
): Promise<
  ServiceResult<{
    subject: LookupSubjectResult;
    alreadyEnrolled: boolean;
  }>
> {
  const subject = await lookupSubjectByCodeForStudent(code);
  if (!subject) {
    return {
      ok: false,
      status: 404,
      code: "SUBJECT_NOT_FOUND",
      message: "Subject not found",
    };
  }

  const supabase = await createServerSupabaseClient();
  const { data: existing } = await supabase
    .from("subject_students")
    .select("subject_id")
    .eq("subject_id", subject.id)
    .eq("student_id", studentId)
    .maybeSingle();

  if (existing) {
    return {
      ok: true,
      message: "You are already enrolled in this subject.",
      data: { subject, alreadyEnrolled: true },
    };
  }

  const { error: insertErr } = await supabase.from("subject_students").insert({
    subject_id: subject.id,
    student_id: studentId,
    created_at: new Date().toISOString(),
  });

  if (insertErr) {
    if (insertErr.code === "23505") {
      return {
        ok: true,
        message: "You are already enrolled in this subject.",
        data: { subject, alreadyEnrolled: true },
      };
    }
    return {
      ok: false,
      status: 400,
      code: "ENROLLMENT_FAILED",
      message: "Unable to enroll in this subject.",
    };
  }

  return {
    ok: true,
    message: "You are successfully enrolled in this subject.",
    data: { subject, alreadyEnrolled: false },
  };
}

export async function unenrollStudentFromSubject(
  studentId: string,
  subjectId: number
): Promise<ServiceResult<null>> {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("subject_students")
    .delete()
    .eq("student_id", studentId)
    .eq("subject_id", subjectId);

  if (error) {
    return {
      ok: false,
      status: 400,
      code: "UNENROLL_FAILED",
      message: "Unable to unenroll from subject.",
    };
  }

  return {
    ok: true,
    message: "Unenrolled from subject successfully.",
    data: null,
  };
}
