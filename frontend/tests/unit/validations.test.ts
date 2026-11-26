import { describe, expect, it } from "vitest";
import {
  studentRegisterSchema,
  teacherLoginSchema,
  teacherRegisterSchema,
} from "@/lib/validations/auth";
import {
  createSubjectSchema,
  subjectCodeSchema,
} from "@/lib/validations/subjects";
import { saveAttendanceSessionSchema } from "@/lib/validations/attendance";

describe("lib/validations", () => {
  it("validates teacher registration constraints", () => {
    const valid = teacherRegisterSchema.safeParse({
      name: "Ada Lovelace",
      email: "ADA@EXAMPLE.COM",
      mobileNumber: "9876543210",
      gender: "female",
      password: "secretPassword",
      confirmPassword: "secretPassword",
    });
    expect(valid.success).toBe(true);
    if (valid.success) {
      expect(valid.data.email).toBe("ada@example.com");
    }

    const badMobile = teacherRegisterSchema.safeParse({
      name: "Ada",
      email: "ada@example.com",
      mobileNumber: "12345",
      gender: "female",
      password: "secretPassword",
      confirmPassword: "secretPassword",
    });
    expect(badMobile.success).toBe(false);

    const mismatch = teacherRegisterSchema.safeParse({
      name: "Ada",
      email: "ada@example.com",
      mobileNumber: "9876543210",
      gender: "female",
      password: "password1",
      confirmPassword: "password2",
    });
    expect(mismatch.success).toBe(false);
  });

  it("enforces student age 5-100, valid gender, and 10-digit mobile", () => {
    const tooYoung = studentRegisterSchema.safeParse({
      name: "Tim",
      email: "tim@example.com",
      mobileNumber: "9876543210",
      age: 4,
      gender: "male",
      password: "password123",
      confirmPassword: "password123",
    });
    expect(tooYoung.success).toBe(false);

    const invalidGender = studentRegisterSchema.safeParse({
      name: "Tim",
      email: "tim@example.com",
      mobileNumber: "9876543210",
      age: 20,
      gender: "Select",
      password: "password123",
      confirmPassword: "password123",
    });
    expect(invalidGender.success).toBe(false);

    const ok = studentRegisterSchema.safeParse({
      name: "Tim",
      email: "tim@example.com",
      mobileNumber: "9876543210",
      age: "20",
      gender: "other",
      password: "password123",
      confirmPassword: "password123",
    });
    expect(ok.success).toBe(true);
  });

  it("rejects unsafe subject join codes and validates attendance payloads", () => {
    expect(subjectCodeSchema.safeParse("CS_101-A").success).toBe(true);
    expect(subjectCodeSchema.safeParse("../admin").success).toBe(false);
    expect(
      createSubjectSchema.safeParse({ code: "CS101", name: "AI", section: "A" }).success
    ).toBe(true);

    expect(
      teacherLoginSchema.safeParse({ identifier: "T1234", password: "pw" }).success
    ).toBe(true);

    expect(
      saveAttendanceSessionSchema.safeParse({
        subjectId: 12,
        idempotencyKey: "11111111-1111-4111-8111-111111111111",
        photoCount: 2,
        entries: [
          {
            student_id: "S1001",
            is_present: true,
            source_photos: ["Photo 1"],
            is_manual_override: false,
          },
        ],
      }).success
    ).toBe(true);
  });
});
