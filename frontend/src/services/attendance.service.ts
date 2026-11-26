import "server-only";

import {
  groupAttendanceSessions,
  type AttendanceSaveEntry,
  type AttendanceSessionSummary,
  type EnrolledStudentForRoster,
  type RawAttendanceRecordRow,
} from "@/domain/attendance";
import { formatDisplayName } from "@/domain/ids";
import {
  computeStudentSubjectStats,
  formatStudentAttendanceHistory,
  type EnrolledSubjectInput,
  type StudentAttendanceHistoryItem,
  type StudentAttendanceLogInput,
  type StudentSubjectStatsCard,
} from "@/domain/student-stats";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";
import type { ServiceResult } from "./auth.service";

export interface SubjectAttendanceRosterData {
  subject: {
    id: number;
    code: string;
    name: string;
    section: string;
  };
  roster: EnrolledStudentForRoster[];
  galleryTemplates: Array<{
    studentId: string;
    modelId: string;
    modelVersion: string;
    preprocessingVersion: string;
    embeddingDimension: number;
    vector: number[];
  }>;
}

export async function getOwnedSubjectRoster(
  teacherId: string,
  subjectId: number
): Promise<ServiceResult<SubjectAttendanceRosterData>> {
  const supabase = await createServerSupabaseClient();

  const { data: subject, error: subErr } = await supabase
    .from("subjects")
    .select("id, code, name, section, teacher_id")
    .eq("id", subjectId)
    .eq("teacher_id", teacherId)
    .maybeSingle();

  if (subErr || !subject) {
    return {
      ok: false,
      status: 404,
      code: "SUBJECT_NOT_FOUND_OR_FORBIDDEN",
      message: "Subject not found or not owned by your account.",
    };
  }

  const { data: enrollments, error: enrollErr } = await supabase
    .from("subject_students")
    .select("student_id, students(id, name)")
    .eq("subject_id", subjectId);

  if (enrollErr) {
    return {
      ok: false,
      status: 500,
      code: "ROSTER_LOAD_FAILED",
      message: "Unable to load enrolled students for this subject.",
    };
  }

  const studentIds = (enrollments ?? []).map((row) => row.student_id);

  const templatesByStudent = new Map<
    string,
    {
      studentId: string;
      modelId: string;
      modelVersion: string;
      preprocessingVersion: string;
      embeddingDimension: number;
      vector: number[];
    }
  >();

  if (studentIds.length > 0) {
    const { data: templates } = await supabase
      .from("student_face_templates")
      .select(
        "student_id, model_id, model_version, preprocessing_version, embedding_dimension, vector"
      )
      .in("student_id", studentIds)
      .eq("is_active", true);

    for (const tpl of templates ?? []) {
      if (Array.isArray(tpl.vector)) {
        const numericVector = tpl.vector.filter(
          (val): val is number => typeof val === "number" && Number.isFinite(val)
        );
        if (numericVector.length === tpl.embedding_dimension) {
          templatesByStudent.set(tpl.student_id, {
            studentId: tpl.student_id,
            modelId: tpl.model_id,
            modelVersion: tpl.model_version,
            preprocessingVersion: tpl.preprocessing_version,
            embeddingDimension: tpl.embedding_dimension,
            vector: numericVector,
          });
        }
      }
    }
  }

  const roster: EnrolledStudentForRoster[] = (enrollments ?? []).map((row) => {
    const studentNode = Array.isArray(row.students)
      ? row.students[0]
      : row.students;
    return {
      studentId: row.student_id,
      studentName: formatDisplayName(studentNode?.name ?? row.student_id),
      hasActiveTemplate: templatesByStudent.has(row.student_id),
    };
  });

  roster.sort((a, b) => a.studentId.localeCompare(b.studentId));

  return {
    ok: true,
    message: "Roster loaded.",
    data: {
      subject: {
        id: subject.id,
        code: subject.code,
        name: formatDisplayName(subject.name),
        section: subject.section.toUpperCase(),
      },
      roster,
      galleryTemplates: Array.from(templatesByStudent.values()),
    },
  };
}

export async function saveTeacherAttendanceSession(
  teacherId: string,
  input: {
    subjectId: number;
    idempotencyKey: string;
    photoCount: number;
    entries: AttendanceSaveEntry[];
  }
): Promise<
  ServiceResult<{
    sessionId: string;
    insertedCount: number;
    deduplicated: boolean;
    recordedAt: string;
  }>
> {
  const supabase = await createServerSupabaseClient();

  // Verify ownership explicitly before RPC call
  const { data: subject } = await supabase
    .from("subjects")
    .select("id")
    .eq("id", input.subjectId)
    .eq("teacher_id", teacherId)
    .maybeSingle();

  if (!subject) {
    return {
      ok: false,
      status: 403,
      code: "SUBJECT_FORBIDDEN",
      message: "You do not have permission to record attendance for this subject.",
    };
  }

  const { data, error } = await supabase.rpc("save_attendance_session", {
    p_subject_id: input.subjectId,
    p_idempotency_key: input.idempotencyKey,
    p_photo_count: input.photoCount,
    p_entries: input.entries as unknown as Json,
  });

  if (error || !data || data.length === 0) {
    return {
      ok: false,
      status: 400,
      code: "ATTENDANCE_SAVE_FAILED",
      message:
        error?.message ??
        "Failed to save attendance records. Review state has been preserved so you can retry safely.",
    };
  }

  const result = data[0];
  if (!result) {
    return {
      ok: false,
      status: 500,
      code: "ATTENDANCE_SAVE_EMPTY",
      message: "Attendance save returned no session confirmation.",
    };
  }

  return {
    ok: true,
    message: "Attendance taken successfully.",
    data: {
      sessionId: result.session_id,
      insertedCount: result.inserted_count,
      deduplicated: result.deduplicated,
      recordedAt: result.recorded_at,
    },
  };
}

export async function listTeacherAttendanceSessions(
  teacherId: string
): Promise<AttendanceSessionSummary[]> {
  const supabase = await createServerSupabaseClient();

  // 1. First get subjects owned by this teacher
  const { data: teacherSubjects, error: subErr } = await supabase
    .from("subjects")
    .select("id, code, name, section")
    .eq("teacher_id", teacherId);

  if (subErr) {
    console.error("[listTeacherAttendanceSessions] Subjects lookup failed:", {
      teacherId,
      code: subErr.code,
      message: subErr.message,
    });
    throw new Error(`Failed to load teacher attendance records: ${subErr.message}`);
  }

  if (!teacherSubjects || teacherSubjects.length === 0) {
    return [];
  }

  const subjectIds = teacherSubjects.map((s) => s.id);
  const subjectMap = new Map<number, { code: string; name: string; section: string }>();
  for (const s of teacherSubjects) {
    subjectMap.set(s.id, { code: s.code, name: s.name, section: s.section });
  }

  // 2. Fetch logs for these subjects
  const { data: logs, error: logErr } = await supabase
    .from("attendance_logs")
    .select(
      "id, timestamp, subject_id, student_id, is_present, session_id, source_photos, is_manual_override, students(name)"
    )
    .in("subject_id", subjectIds)
    .order("timestamp", { ascending: false })
    .limit(5000);

  if (logErr) {
    console.error("[listTeacherAttendanceSessions] Logs query failed:", {
      teacherId,
      code: logErr.code,
      message: logErr.message,
    });
    throw new Error(`Failed to load teacher attendance records: ${logErr.message}`);
  }

  if (!logs || logs.length === 0) {
    return [];
  }

  const normalizedRows: RawAttendanceRecordRow[] = logs.map((row) => {
    const subInfo = row.subject_id ? subjectMap.get(row.subject_id) : undefined;
    const stu = Array.isArray(row.students) ? row.students[0] : row.students;
    return {
      id: row.id,
      timestamp: row.timestamp,
      subject_id: row.subject_id,
      student_id: row.student_id,
      is_present: row.is_present,
      session_id: row.session_id,
      source_photos: row.source_photos ?? [],
      is_manual_override: row.is_manual_override ?? false,
      subjectCode: subInfo?.code ?? "N/A",
      subjectName: subInfo?.name ?? "N/A",
      subjectSection: subInfo?.section ?? "N/A",
      studentName: stu?.name ?? row.student_id ?? "Unknown",
    };
  });

  return groupAttendanceSessions(normalizedRows);
}

export async function getStudentPortalData(studentId: string): Promise<{
  subjects: StudentSubjectStatsCard[];
  history: StudentAttendanceHistoryItem[];
}> {
  const supabase = await createServerSupabaseClient();

  const [enrolledRes, attendanceRes] = await Promise.all([
    supabase
      .from("subject_students")
      .select("subject_id, created_at, subjects(id, code, name, section)")
      .eq("student_id", studentId),
    supabase
      .from("attendance_logs")
      .select(
        "id, timestamp, subject_id, is_present, is_manual_override, source_photos, subjects(id, code, name, section)"
      )
      .eq("student_id", studentId)
      .order("timestamp", { ascending: false })
      .limit(1000),
  ]);

  if (enrolledRes.error || attendanceRes.error) {
    throw new Error("Failed to load student enrollment and attendance data.");
  }

  const enrolledInputs: EnrolledSubjectInput[] = (enrolledRes.data ?? [])
    .map((row) => {
      const sub = Array.isArray(row.subjects) ? row.subjects[0] : row.subjects;
      if (!sub) return null;
      return {
        subjectId: sub.id,
        code: sub.code,
        name: sub.name,
        section: sub.section,
        enrolledAt: row.created_at,
      };
    })
    .filter((item): item is EnrolledSubjectInput => item !== null);

  const attendanceInputs: StudentAttendanceLogInput[] = (attendanceRes.data ?? [])
    .map((row) => {
      const sub = Array.isArray(row.subjects) ? row.subjects[0] : row.subjects;
      if (!sub || row.subject_id === null) return null;
      return {
        id: row.id,
        subjectId: row.subject_id,
        subjectCode: sub.code,
        subjectName: sub.name,
        subjectSection: sub.section,
        timestamp: row.timestamp,
        isPresent: Boolean(row.is_present),
        isManualOverride: Boolean(row.is_manual_override),
        sourcePhotos: row.source_photos ?? [],
      };
    })
    .filter((item): item is StudentAttendanceLogInput => item !== null);

  return {
    subjects: computeStudentSubjectStats(enrolledInputs, attendanceInputs),
    history: formatStudentAttendanceHistory(attendanceInputs),
  };
}
