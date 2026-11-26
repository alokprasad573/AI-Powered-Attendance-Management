import { describe, expect, it } from "vitest";
import {
  aggregateMultiPhotoAttendance,
  applyManualOverride,
  buildAttendanceSavePayload,
  exportSessionsToCsv,
  filterAndSortSessionSummaries,
  groupAttendanceSessions,
} from "@/domain/attendance";

describe("domain/attendance", () => {
  const roster = [
    { studentId: "S1001", studentName: "alice smith", hasActiveTemplate: true },
    { studentId: "S1002", studentName: "bob jones", hasActiveTemplate: true },
    { studentId: "S1003", studentName: "carol lee", hasActiveTemplate: false },
  ];

  it("deduplicates multi-photo recognitions, preserves source attribution, excludes non-enrolled, and includes absentees", () => {
    const summary = aggregateMultiPhotoAttendance(roster, [
      {
        photoIndex: 0,
        photoLabel: "Photo 1",
        totalFacesDetected: 3,
        failed: false,
        identifications: [
          { faceIndex: 0, studentId: "S1001", confidence: 0.91, accepted: true },
          { faceIndex: 1, studentId: "S9999", confidence: 0.93, accepted: true },
          { faceIndex: 2, studentId: null, confidence: 0.4, accepted: false, reason: "unknown" },
        ],
      },
      {
        photoIndex: 1,
        photoLabel: "Photo 2",
        totalFacesDetected: 2,
        failed: false,
        identifications: [
          { faceIndex: 0, studentId: "S1001", confidence: 0.95, accepted: true },
          { faceIndex: 1, studentId: null, confidence: 0.72, accepted: false, reason: "ambiguous" },
        ],
      },
      {
        photoIndex: 2,
        photoLabel: "Photo 3",
        totalFacesDetected: 0,
        failed: true,
        errorMessage: "Decode timeout",
        identifications: [],
      },
    ]);

    expect(summary.presentCount).toBe(1);
    expect(summary.absentCount).toBe(2);
    expect(summary.ignoredNonEnrolledMatches).toBe(1);
    expect(summary.unknownFaceCount).toBe(1);
    expect(summary.ambiguousFaceCount).toBe(1);
    expect(summary.failedPhotos).toHaveLength(1);

    const alice = summary.rows.find((r) => r.studentId === "S1001");
    expect(alice?.isPresent).toBe(true);
    expect(alice?.sourcePhotos).toEqual(["Photo 1", "Photo 2"]);
    expect(alice?.bestConfidence).toBe(0.95);

    const bob = summary.rows.find((r) => r.studentId === "S1002");
    expect(bob?.isPresent).toBe(false);
    expect(bob?.sourcePhotos).toEqual([]);
  });

  it("supports manual overrides and clears override flag when reverted", () => {
    const summary = aggregateMultiPhotoAttendance(roster, []);
    const afterPresent = applyManualOverride(summary.rows, "S1002", true);
    const bobOverride = afterPresent.find((r) => r.studentId === "S1002");
    expect(bobOverride?.isPresent).toBe(true);
    expect(bobOverride?.isManualOverride).toBe(true);

    const reverted = applyManualOverride(afterPresent, "S1002", false);
    const bobReverted = reverted.find((r) => r.studentId === "S1002");
    expect(bobReverted?.isPresent).toBe(false);
    expect(bobReverted?.isManualOverride).toBe(false);

    const payload = buildAttendanceSavePayload(
      10,
      "11111111-1111-4111-8111-111111111111",
      2,
      afterPresent
    );
    expect(payload.entries).toHaveLength(3);
  });

  it("groups sessions like legacy attendance_records.py, filters, sorts, and escapes CSV formulas", () => {
    const sessions = groupAttendanceSessions([
      {
        id: 1,
        timestamp: "2026-10-01T09:00:00.000Z",
        subject_id: 1,
        student_id: "S1001",
        is_present: true,
        session_id: null,
        source_photos: ["Photo 1"],
        is_manual_override: false,
        subjectCode: "CS101",
        subjectName: "algorithms",
        subjectSection: "a",
        studentName: "=HYPERLINK(\"http://evil\",\"Alice\")",
      },
      {
        id: 2,
        timestamp: "2026-10-01T09:00:00.120Z",
        subject_id: 1,
        student_id: "S1002",
        is_present: false,
        session_id: null,
        source_photos: [],
        is_manual_override: false,
        subjectCode: "CS101",
        subjectName: "algorithms",
        subjectSection: "a",
        studentName: "Bob",
      },
      {
        id: 3,
        timestamp: "2026-10-05T11:30:00.000Z",
        subject_id: 2,
        student_id: "S1001",
        is_present: true,
        session_id: "sess-2",
        source_photos: ["Photo 1"],
        is_manual_override: true,
        subjectCode: "CS202",
        subjectName: "databases",
        subjectSection: "b",
        studentName: "Alice",
      },
    ]);

    expect(sessions).toHaveLength(2);
    expect(sessions[0]?.subjectCode).toBe("CS202");
    expect(sessions[1]?.statsLabel).toBe("✅ 1 / 2 Students");

    const filtered = filterAndSortSessionSummaries(sessions, {
      subjectCode: "CS101",
    });
    expect(filtered).toHaveLength(1);

    const csv = exportSessionsToCsv(filtered);
    expect(csv).toContain("\"'=hyperlink");
  });
});
