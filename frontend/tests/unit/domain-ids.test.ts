import { describe, expect, it } from "vitest";
import {
  formatDisplayName,
  generateStudentId,
  generateTeacherId,
  getTeacherHonorific,
  getTimeGreeting,
  normalizeSubjectInput,
} from "@/domain/ids";

describe("domain/ids", () => {
  it("generates T#### and S#### IDs matching legacy format", () => {
    for (let i = 0; i < 20; i += 1) {
      expect(generateTeacherId()).toMatch(/^T\d{4}$/);
      expect(generateStudentId()).toMatch(/^S\d{4}$/);
    }
  });

  it("normalizes subject code trimmed, name lowercase, and section uppercase", () => {
    expect(
      normalizeSubjectInput({
        code: "  CS101 ",
        name: "  Introduction To AI  ",
        section: " a1 ",
      })
    ).toEqual({
      code: "CS101",
      name: "introduction to ai",
      section: "A1",
    });
  });

  it("formats display names and teacher honorifics consistently", () => {
    expect(formatDisplayName("alok prasad")).toBe("Alok Prasad");
    expect(getTeacherHonorific("john doe", "male")).toEqual({
      displayName: "Mr. John Doe",
      honorific: "Sir",
    });
    expect(getTeacherHonorific("jane smith", "female")).toEqual({
      displayName: "Ms. Jane Smith",
      honorific: "Ma'am",
    });
  });

  it("produces legacy time-of-day greetings for teacher and student", () => {
    expect(getTimeGreeting(8, "teacher")).toBe("Good Morning");
    expect(getTimeGreeting(14, "teacher")).toBe("Good Afternoon");
    expect(getTimeGreeting(18, "teacher")).toBe("Good Evening");
    expect(getTimeGreeting(22, "teacher")).toBe("Hey there");

    expect(getTimeGreeting(9, "student")).toBe("Good Morning, Student");
    expect(getTimeGreeting(13, "student")).toBe("Good Afternoon, Student");
    expect(getTimeGreeting(18, "student")).toBe("Good Evening, Student");
    expect(getTimeGreeting(23, "student")).toBe("Hello, Student 👋");
  });
});
