import { describe, expect, it } from "vitest";
import {
  computeStudentSubjectStats,
  formatStudentAttendanceHistory,
} from "@/domain/student-stats";

describe("domain/student-stats", () => {
  it("computes per-subject total, attended, percentage, and chronological history", () => {
    const enrolled = [
      {
        subjectId: 1,
        code: "CS101",
        name: "artificial intelligence",
        section: "a",
        enrolledAt: "2026-09-01T00:00:00Z",
      },
      {
        subjectId: 2,
        code: "CS102",
        name: "operating systems",
        section: "b",
        enrolledAt: "2026-09-02T00:00:00Z",
      },
    ];

    const logs = [
      {
        id: 10,
        subjectId: 1,
        subjectCode: "CS101",
        subjectName: "artificial intelligence",
        subjectSection: "a",
        timestamp: "2026-10-01T09:00:00Z",
        isPresent: true,
        isManualOverride: false,
        sourcePhotos: ["Photo 1"],
      },
      {
        id: 11,
        subjectId: 1,
        subjectCode: "CS101",
        subjectName: "artificial intelligence",
        subjectSection: "a",
        timestamp: "2026-10-03T09:00:00Z",
        isPresent: false,
        isManualOverride: false,
        sourcePhotos: [],
      },
    ];

    const stats = computeStudentSubjectStats(enrolled, logs);
    expect(stats[0]).toMatchObject({
      code: "CS101",
      name: "Artificial Intelligence",
      section: "A",
      total: 2,
      attended: 1,
      attendancePercent: 50,
    });
    expect(stats[1]).toMatchObject({
      code: "CS102",
      total: 0,
      attended: 0,
      attendancePercent: 0,
    });

    const history = formatStudentAttendanceHistory(logs);
    expect(history[0]?.id).toBe(11);
    expect(history[1]?.id).toBe(10);
  });
});
