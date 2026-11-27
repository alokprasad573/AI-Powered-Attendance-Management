import { formatLegacyTimestamp } from "./attendance";
import { formatDisplayName } from "./ids";

export interface EnrolledSubjectInput {
  subjectId: number;
  code: string;
  name: string;
  section: string;
  enrolledAt: string | null;
}

export interface StudentAttendanceLogInput {
  id: number;
  subjectId: number;
  subjectCode: string;
  subjectName: string;
  subjectSection: string;
  timestamp: string | null;
  isPresent: boolean;
  isManualOverride: boolean;
  sourcePhotos: string[];
}

export interface StudentSubjectStatsCard {
  subjectId: number;
  code: string;
  name: string;
  section: string;
  total: number;
  attended: number;
  attendancePercent: number;
}

export interface StudentAttendanceHistoryItem {
  id: number;
  subjectId: number;
  subjectCode: string;
  subjectName: string;
  subjectSection: string;
  timestampIso: string;
  formattedTime: string;
  isPresent: boolean;
  isManualOverride: boolean;
}

export function computeStudentSubjectStats(
  enrolledSubjects: readonly EnrolledSubjectInput[],
  attendanceLogs: readonly StudentAttendanceLogInput[]
): StudentSubjectStatsCard[] {
  const counts = new Map<number, { total: number; attended: number }>();

  for (const log of attendanceLogs) {
    const existing = counts.get(log.subjectId) ?? { total: 0, attended: 0 };
    existing.total += 1;
    if (log.isPresent) {
      existing.attended += 1;
    }
    counts.set(log.subjectId, existing);
  }

  return enrolledSubjects.map((subject) => {
    const stat = counts.get(subject.subjectId) ?? { total: 0, attended: 0 };
    const attendancePercent =
      stat.total > 0 ? Math.round((stat.attended / stat.total) * 1000) / 10 : 0;

    return {
      subjectId: subject.subjectId,
      code: subject.code,
      name: formatDisplayName(subject.name),
      section: subject.section.toUpperCase(),
      total: stat.total,
      attended: stat.attended,
      attendancePercent,
    };
  });
}

export function formatStudentAttendanceHistory(
  attendanceLogs: readonly StudentAttendanceLogInput[]
): StudentAttendanceHistoryItem[] {
  return [...attendanceLogs]
    .sort((a, b) => (b.timestamp ?? "").localeCompare(a.timestamp ?? ""))
    .map((log) => ({
      id: log.id,
      subjectId: log.subjectId,
      subjectCode: log.subjectCode,
      subjectName: formatDisplayName(log.subjectName),
      subjectSection: log.subjectSection.toUpperCase(),
      timestampIso: log.timestamp ?? "",
      formattedTime: formatLegacyTimestamp(log.timestamp),
      isPresent: log.isPresent,
      isManualOverride: log.isManualOverride,
    }));
}
