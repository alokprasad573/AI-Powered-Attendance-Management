import { formatDisplayName } from "./ids";

export interface EnrolledStudentForRoster {
  studentId: string;
  studentName: string;
  hasActiveTemplate: boolean;
}

export interface FaceIdentificationCandidate {
  faceIndex: number;
  studentId: string | null;
  confidence: number | null;
  accepted: boolean;
  reason?: "unknown" | "low_quality" | "ambiguous";
}

export interface PhotoAnalysisResult {
  photoIndex: number;
  photoLabel: string;
  totalFacesDetected: number;
  identifications: readonly FaceIdentificationCandidate[];
  failed: boolean;
  errorMessage?: string;
}

export interface AttendanceReviewRow {
  studentId: string;
  studentName: string;
  sourcePhotos: string[];
  autoDetectedPresent: boolean;
  isPresent: boolean;
  isManualOverride: boolean;
  bestConfidence: number | null;
}

export interface AttendanceAggregationSummary {
  rows: AttendanceReviewRow[];
  presentCount: number;
  absentCount: number;
  totalFacesDetected: number;
  unknownFaceCount: number;
  ambiguousFaceCount: number;
  lowQualityFaceCount: number;
  ignoredNonEnrolledMatches: number;
  failedPhotos: Array<{ photoIndex: number; photoLabel: string; errorMessage: string }>;
}

export function aggregateMultiPhotoAttendance(
  roster: readonly EnrolledStudentForRoster[],
  photoResults: readonly PhotoAnalysisResult[]
): AttendanceAggregationSummary {
  const enrolledIds = new Set(roster.map((student) => student.studentId));
  const matchedSources = new Map<string, Set<string>>();
  const bestConfidenceByStudent = new Map<string, number>();

  let totalFacesDetected = 0;
  let unknownFaceCount = 0;
  let ambiguousFaceCount = 0;
  let lowQualityFaceCount = 0;
  let ignoredNonEnrolledMatches = 0;
  const failedPhotos: Array<{ photoIndex: number; photoLabel: string; errorMessage: string }> = [];

  for (const photo of photoResults) {
    if (photo.failed) {
      failedPhotos.push({
        photoIndex: photo.photoIndex,
        photoLabel: photo.photoLabel,
        errorMessage: photo.errorMessage ?? "Photo analysis failed.",
      });
      continue;
    }

    totalFacesDetected += photo.totalFacesDetected;

    for (const candidate of photo.identifications) {
      if (!candidate.accepted || !candidate.studentId) {
        if (candidate.reason === "ambiguous") ambiguousFaceCount += 1;
        else if (candidate.reason === "low_quality") lowQualityFaceCount += 1;
        else unknownFaceCount += 1;
        continue;
      }

      if (!enrolledIds.has(candidate.studentId)) {
        ignoredNonEnrolledMatches += 1;
        continue;
      }

      const sources = matchedSources.get(candidate.studentId) ?? new Set<string>();
      sources.add(photo.photoLabel);
      matchedSources.set(candidate.studentId, sources);

      if (typeof candidate.confidence === "number") {
        const prev = bestConfidenceByStudent.get(candidate.studentId);
        if (prev === undefined || candidate.confidence > prev) {
          bestConfidenceByStudent.set(candidate.studentId, candidate.confidence);
        }
      }
    }
  }

  const rows: AttendanceReviewRow[] = roster.map((student) => {
    const sources = Array.from(matchedSources.get(student.studentId) ?? []);
    const autoDetectedPresent = sources.length > 0;
    return {
      studentId: student.studentId,
      studentName: formatDisplayName(student.studentName),
      sourcePhotos: sources,
      autoDetectedPresent,
      isPresent: autoDetectedPresent,
      isManualOverride: false,
      bestConfidence: bestConfidenceByStudent.get(student.studentId) ?? null,
    };
  });

  const presentCount = rows.filter((row) => row.isPresent).length;

  return {
    rows,
    presentCount,
    absentCount: rows.length - presentCount,
    totalFacesDetected,
    unknownFaceCount,
    ambiguousFaceCount,
    lowQualityFaceCount,
    ignoredNonEnrolledMatches,
    failedPhotos,
  };
}

export function applyManualOverride(
  rows: readonly AttendanceReviewRow[],
  studentId: string,
  nextIsPresent: boolean
): AttendanceReviewRow[] {
  return rows.map((row) => {
    if (row.studentId !== studentId) {
      return row;
    }
    return {
      ...row,
      isPresent: nextIsPresent,
      isManualOverride: nextIsPresent !== row.autoDetectedPresent,
    };
  });
}

export interface AttendanceSaveEntry {
  student_id: string;
  is_present: boolean;
  source_photos: string[];
  is_manual_override: boolean;
}

export interface AttendanceSavePayload {
  subjectId: number;
  idempotencyKey: string;
  photoCount: number;
  entries: AttendanceSaveEntry[];
}

export function buildAttendanceSavePayload(
  subjectId: number,
  idempotencyKey: string,
  photoCount: number,
  rows: readonly AttendanceReviewRow[]
): AttendanceSavePayload {
  return {
    subjectId,
    idempotencyKey,
    photoCount,
    entries: rows.map((row) => ({
      student_id: row.studentId,
      is_present: row.isPresent,
      source_photos: row.sourcePhotos,
      is_manual_override: row.isManualOverride,
    })),
  };
}

export interface RawAttendanceRecordRow {
  id: number;
  timestamp: string | null;
  subject_id: number | null;
  student_id: string | null;
  is_present: boolean | null;
  session_id: string | null;
  source_photos: string[];
  is_manual_override: boolean;
  subjectCode: string;
  subjectName: string;
  subjectSection: string;
  studentName?: string;
}

export interface AttendanceSessionSummary {
  sessionKey: string;
  timestampIso: string;
  formattedTime: string;
  subjectId: number;
  subjectCode: string;
  subjectName: string;
  subjectSection: string;
  presentCount: number;
  totalCount: number;
  attendanceRatePercent: number;
  statsLabel: string;
  entries: Array<{
    logId: number;
    studentId: string;
    studentName: string;
    isPresent: boolean;
    sourcePhotos: string[];
    isManualOverride: boolean;
  }>;
}

export function formatLegacyTimestamp(ts: string | null): string {
  if (!ts) return "N/A";
  const parsed = new Date(ts);
  if (Number.isNaN(parsed.getTime())) {
    return ts;
  }
  const yyyy = parsed.getFullYear();
  const mm = String(parsed.getMonth() + 1).padStart(2, "0");
  const dd = String(parsed.getDate()).padStart(2, "0");
  const rawHour = parsed.getHours();
  const ampm = rawHour >= 12 ? "PM" : "AM";
  const hour12 = String(rawHour % 12 === 0 ? 12 : rawHour % 12).padStart(2, "0");
  const min = String(parsed.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hour12}:${min} ${ampm}`;
}

export function groupAttendanceSessions(
  records: readonly RawAttendanceRecordRow[]
): AttendanceSessionSummary[] {
  const groups = new Map<string, AttendanceSessionSummary>();

  for (const row of records) {
    if (!row.timestamp || row.subject_id === null || !row.student_id) {
      continue;
    }

    const legacyGroup = row.timestamp.split(".")[0] ?? row.timestamp;
    const sessionKey = row.session_id
      ? `session:${row.session_id}`
      : `legacy:${legacyGroup}:${row.subject_id}`;

    let group = groups.get(sessionKey);
    if (!group) {
      group = {
        sessionKey,
        timestampIso: row.timestamp,
        formattedTime: formatLegacyTimestamp(row.timestamp),
        subjectId: row.subject_id,
        subjectCode: row.subjectCode,
        subjectName: formatDisplayName(row.subjectName),
        subjectSection: row.subjectSection.toUpperCase(),
        presentCount: 0,
        totalCount: 0,
        attendanceRatePercent: 0,
        statsLabel: "✅ 0 / 0 Students",
        entries: [],
      };
      groups.set(sessionKey, group);
    }

    const isPresent = Boolean(row.is_present);
    if (isPresent) {
      group.presentCount += 1;
    }
    group.totalCount += 1;
    group.entries.push({
      logId: row.id,
      studentId: row.student_id,
      studentName: formatDisplayName(row.studentName ?? row.student_id),
      isPresent,
      sourcePhotos: row.source_photos ?? [],
      isManualOverride: Boolean(row.is_manual_override),
    });
  }

  const summaries = Array.from(groups.values());
  for (const summary of summaries) {
    summary.attendanceRatePercent =
      summary.totalCount > 0
        ? Math.round((summary.presentCount / summary.totalCount) * 1000) / 10
        : 0;
    summary.statsLabel = `✅ ${summary.presentCount} / ${summary.totalCount} Students`;
    summary.entries.sort((a, b) => a.studentId.localeCompare(b.studentId));
  }

  return summaries.sort((a, b) => b.timestampIso.localeCompare(a.timestampIso));
}

export interface RecordFilterOptions {
  subjectCode?: string;
  query?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: "time_desc" | "time_asc" | "subject_asc" | "rate_desc";
}

export function filterAndSortSessionSummaries(
  sessions: readonly AttendanceSessionSummary[],
  options: RecordFilterOptions
): AttendanceSessionSummary[] {
  const codeFilter = options.subjectCode?.trim().toUpperCase();
  const query = options.query?.trim().toLowerCase();
  const fromMs = options.dateFrom ? Date.parse(`${options.dateFrom}T00:00:00`) : null;
  const toMs = options.dateTo ? Date.parse(`${options.dateTo}T23:59:59.999`) : null;

  const filtered = sessions.filter((session) => {
    if (codeFilter && codeFilter !== "ALL" && session.subjectCode.toUpperCase() !== codeFilter) {
      return false;
    }

    if (query) {
      const matchesMeta =
        session.subjectCode.toLowerCase().includes(query) ||
        session.subjectName.toLowerCase().includes(query) ||
        session.entries.some(
          (entry) =>
            entry.studentId.toLowerCase().includes(query) ||
            entry.studentName.toLowerCase().includes(query)
        );
      if (!matchesMeta) return false;
    }

    const sessionMs = Date.parse(session.timestampIso);
    if (fromMs !== null && !Number.isNaN(sessionMs) && sessionMs < fromMs) {
      return false;
    }
    if (toMs !== null && !Number.isNaN(sessionMs) && sessionMs > toMs) {
      return false;
    }

    return true;
  });

  const sorted = [...filtered];
  switch (options.sortBy) {
    case "time_asc":
      sorted.sort((a, b) => a.timestampIso.localeCompare(b.timestampIso));
      break;
    case "subject_asc":
      sorted.sort((a, b) => a.subjectCode.localeCompare(b.subjectCode));
      break;
    case "rate_desc":
      sorted.sort((a, b) => b.attendanceRatePercent - a.attendanceRatePercent);
      break;
    case "time_desc":
    default:
      sorted.sort((a, b) => b.timestampIso.localeCompare(a.timestampIso));
      break;
  }

  return sorted;
}

function escapeCsvCell(rawValue: string | number | boolean): string {
  let str = String(rawValue);
  // Prevent CSV formula injection in spreadsheet tools
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportSessionsToCsv(
  sessions: readonly AttendanceSessionSummary[]
): string {
  const headers = [
    "Time",
    "Timestamp ISO",
    "Subject Code",
    "Subject",
    "Section",
    "Student ID",
    "Student Name",
    "Status",
    "Manual Override",
    "Source Photos",
    "Session Stats",
  ];

  const lines = [headers.map(escapeCsvCell).join(",")];

  for (const session of sessions) {
    for (const entry of session.entries) {
      lines.push(
        [
          session.formattedTime,
          session.timestampIso,
          session.subjectCode,
          session.subjectName,
          session.subjectSection,
          entry.studentId,
          entry.studentName,
          entry.isPresent ? "Present" : "Absent",
          entry.isManualOverride ? "Yes" : "No",
          entry.sourcePhotos.join("; "),
          session.statsLabel,
        ]
          .map(escapeCsvCell)
          .join(",")
      );
    }
  }

  return lines.join("\r\n");
}
