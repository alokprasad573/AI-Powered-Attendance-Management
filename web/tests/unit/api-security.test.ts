import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthorizationError } from "@/services/session-guard";

const mocks = vi.hoisted(() => ({
  requireAuthenticatedTeacher: vi.fn(),
  requireAuthenticatedStudent: vi.fn(),
  saveTeacherAttendanceSession: vi.fn(),
  listTeacherSubjects: vi.fn(),
  deleteTeacherSubject: vi.fn(),
  enrollStudentByCode: vi.fn(),
  exchangeCodeForSession: vi.fn(),
  signInWithOtp: vi.fn(),
  verifyOtp: vi.fn(),
  signOut: vi.fn(),
  getUser: vi.fn(),
  rpc: vi.fn(),
  fromSelectMaybeSingle: vi.fn(),
}));

vi.mock("@/services/session-guard", async () => {
  const actual = await vi.importActual<typeof import("@/services/session-guard")>(
    "@/services/session-guard"
  );
  return {
    ...actual,
    requireAuthenticatedTeacher: mocks.requireAuthenticatedTeacher,
    requireAuthenticatedStudent: mocks.requireAuthenticatedStudent,
  };
});

vi.mock("@/services/attendance.service", () => ({
  saveTeacherAttendanceSession: mocks.saveTeacherAttendanceSession,
  getOwnedSubjectRoster: vi.fn(),
  listTeacherAttendanceSessions: vi.fn(),
  getStudentPortalData: vi.fn(),
}));

vi.mock("@/services/subjects.service", () => ({
  listTeacherSubjects: mocks.listTeacherSubjects,
  createTeacherSubject: vi.fn(),
  deleteTeacherSubject: mocks.deleteTeacherSubject,
  enrollStudentByCode: mocks.enrollStudentByCode,
  unenrollStudentFromSubject: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    auth: {
      exchangeCodeForSession: mocks.exchangeCodeForSession,
      signInWithOtp: mocks.signInWithOtp,
      verifyOtp: mocks.verifyOtp,
      signOut: mocks.signOut,
      getUser: mocks.getUser,
    },
    rpc: mocks.rpc,
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: mocks.fromSelectMaybeSingle,
        })),
      })),
    })),
  })),
}));

import { POST as faceLoginPost } from "@/app/api/auth/student/face-login/route";
import { POST as faceLoginVerifyOtpPost } from "@/app/api/auth/student/face-login/verify-otp/route";
import { POST as teacherRegisterPost } from "@/app/api/auth/teacher/register/route";
import { POST as attendanceSavePost } from "@/app/api/teacher/attendance/save/route";
import {
  DELETE as teacherSubjectsDelete,
  GET as teacherSubjectsGet,
} from "@/app/api/teacher/subjects/route";
import { POST as studentEnrollPost } from "@/app/api/student/enroll/route";
import { GET as authCallbackGet } from "@/app/auth/callback/route";
import { TARGET_BIOMETRIC_CONTRACT } from "@/domain/biometrics";
import { resetRateLimitBuckets } from "@/lib/rate-limit";

function makeUnitVector128(): number[] {
  const vec = new Array<number>(128).fill(0);
  vec[0] = 1;
  return vec;
}

describe("API authorization and security boundaries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetRateLimitBuckets();
    mocks.getUser.mockResolvedValue({ data: { user: null } });
  });

  it("rejects spoofed client-only face-login claims lacking a valid 128D SFace vector (HTTP 400)", async () => {
    const req = new Request("http://localhost:3000/api/auth/student/face-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ student_id: "S1001", faceDetected: true }),
    });
    const res = await faceLoginPost(req);
    expect(res.status).toBe(400);
    const body = (await res.json()) as { ok: boolean; code: string };
    expect(body.ok).toBe(false);
    expect(body.code).toBe("VALIDATION_ERROR");
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.signInWithOtp).not.toHaveBeenCalled();
  });

  it("verifies 128D face vector server-side via PostgreSQL RPC and dispatches masked Email OTP without minting a session", async () => {
    mocks.rpc.mockResolvedValue({
      data: [
        {
          verified: true,
          student_id: "S1001",
          email_id: "student.one@example.com",
          reason: "matched",
        },
      ],
      error: null,
    });
    mocks.signInWithOtp.mockResolvedValue({ data: {}, error: null });

    const req = new Request("http://localhost:3000/api/auth/student/face-login", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": "10.0.0.1" },
      body: JSON.stringify({
        identifier: "S1001",
        modelId: TARGET_BIOMETRIC_CONTRACT.modelId,
        modelVersion: TARGET_BIOMETRIC_CONTRACT.modelVersion,
        preprocessingVersion: TARGET_BIOMETRIC_CONTRACT.preprocessingVersion,
        embeddingDimension: TARGET_BIOMETRIC_CONTRACT.expectedDimension,
        vector: makeUnitVector128(),
        joinCode: "CS105",
      }),
    });

    const res = await faceLoginPost(req);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      ok: boolean;
      data: { studentId: string; maskedEmail: string; otpSent: boolean };
    };
    expect(body.ok).toBe(true);
    expect(body.data.studentId).toBe("S1001");
    expect(body.data.maskedEmail).toBe("s***e@example.com");
    expect(body.data.otpSent).toBe(true);
    expect(mocks.signInWithOtp).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "student.one@example.com",
        options: expect.objectContaining({
          shouldCreateUser: false,
        }),
      })
    );
  });

  it("rejects non-matching face probes without sending OTP email (HTTP 401)", async () => {
    mocks.rpc.mockResolvedValue({
      data: [
        {
          verified: false,
          student_id: null,
          email_id: null,
          reason: "face_mismatch",
        },
      ],
      error: null,
    });

    const req = new Request("http://localhost:3000/api/auth/student/face-login", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": "10.0.0.2" },
      body: JSON.stringify({
        identifier: "S1001",
        modelId: TARGET_BIOMETRIC_CONTRACT.modelId,
        modelVersion: TARGET_BIOMETRIC_CONTRACT.modelVersion,
        preprocessingVersion: TARGET_BIOMETRIC_CONTRACT.preprocessingVersion,
        embeddingDimension: TARGET_BIOMETRIC_CONTRACT.expectedDimension,
        vector: makeUnitVector128(),
      }),
    });

    const res = await faceLoginPost(req);
    expect(res.status).toBe(401);
    const body = (await res.json()) as { ok: boolean; code: string };
    expect(body.ok).toBe(false);
    expect(body.code).toBe("FACE_VERIFICATION_FAILED");
    expect(mocks.signInWithOtp).not.toHaveBeenCalled();
  });

  it("rate-limits excessive face-login initiation attempts with HTTP 429", async () => {
    mocks.rpc.mockResolvedValue({
      data: [{ verified: false, student_id: null, email_id: null, reason: "face_mismatch" }],
      error: null,
    });

    const makeReq = () =>
      new Request("http://localhost:3000/api/auth/student/face-login", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-forwarded-for": "10.0.0.99" },
        body: JSON.stringify({
          identifier: "S9999",
          modelId: TARGET_BIOMETRIC_CONTRACT.modelId,
          modelVersion: TARGET_BIOMETRIC_CONTRACT.modelVersion,
          preprocessingVersion: TARGET_BIOMETRIC_CONTRACT.preprocessingVersion,
          embeddingDimension: TARGET_BIOMETRIC_CONTRACT.expectedDimension,
          vector: makeUnitVector128(),
        }),
      });

    for (let i = 0; i < 5; i += 1) {
      const r = await faceLoginPost(makeReq());
      expect(r.status).toBe(401);
    }
    const blocked = await faceLoginPost(makeReq());
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("retry-after")).toBeTruthy();
  });

  it("completes student face-OTP sign-in via server-side verifyOtp and verifies student profile ownership", async () => {
    mocks.rpc.mockResolvedValue({
      data: [{ email_id: "student.one@example.com", is_linked: true }],
      error: null,
    });
    mocks.verifyOtp.mockResolvedValue({
      data: { user: { id: "auth-u1", email: "student.one@example.com", user_metadata: {} } },
      error: null,
    });
    mocks.fromSelectMaybeSingle.mockResolvedValue({
      data: { id: "S1001", name: "student one" },
      error: null,
    });

    const req = new Request("http://localhost:3000/api/auth/student/face-login/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": "10.0.0.3" },
      body: JSON.stringify({ identifier: "S1001", token: "123456" }),
    });

    const res = await faceLoginVerifyOtpPost(req);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      ok: boolean;
      data: { studentId: string; name: string };
    };
    expect(body.ok).toBe(true);
    expect(body.data.studentId).toBe("S1001");
    expect(mocks.verifyOtp).toHaveBeenCalledWith({
      email: "student.one@example.com",
      token: "123456",
      type: "email",
    });
  });

  it("runs teacher duplicate registration checks via RPC without SUPABASE_SERVICE_ROLE_KEY", async () => {
    mocks.rpc.mockResolvedValue({
      data: [{ id_taken: false, email_taken: true, mobile_taken: false }],
      error: null,
    });

    const req = new Request("http://localhost:3000/api/auth/teacher/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Ada Lovelace",
        email: "ada@example.com",
        mobileNumber: "9876543210",
        gender: "female",
        password: "secretPassword",
        confirmPassword: "secretPassword",
      }),
    });

    const res = await teacherRegisterPost(req);
    expect(res.status).toBe(409);
    const body = (await res.json()) as { ok: boolean; code: string };
    expect(body.ok).toBe(false);
    expect(body.code).toBe("DUPLICATE_ACCOUNT");
    expect(mocks.rpc).toHaveBeenCalledWith(
      "check_registration_conflicts",
      expect.objectContaining({
        p_role: "teacher",
        p_email: "ada@example.com",
      })
    );
  });

  it("denies unauthenticated access to teacher subjects with 401", async () => {
    mocks.requireAuthenticatedTeacher.mockRejectedValue(
      new AuthorizationError(401, "UNAUTHENTICATED", "Auth required")
    );
    const res = await teacherSubjectsGet();
    expect(res.status).toBe(401);
  });

  it("denies non-teacher subject deletion with 403 and rejects invalid subjectId with 400", async () => {
    mocks.requireAuthenticatedTeacher.mockRejectedValueOnce(
      new AuthorizationError(403, "TEACHER_ROLE_REQUIRED", "Teacher role required")
    );
    const forbiddenReq = new Request("http://localhost:3000/api/teacher/subjects", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subjectId: 12 }),
    });
    const forbiddenRes = await teacherSubjectsDelete(forbiddenReq);
    expect(forbiddenRes.status).toBe(403);

    mocks.requireAuthenticatedTeacher.mockResolvedValueOnce({
      id: "T1001",
      authUserId: "u1",
      name: "Teacher",
      emailId: "t@example.com",
      mobileNumber: "9876543210",
      gender: "male",
    });
    const invalidReq = new Request("http://localhost:3000/api/teacher/subjects", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subjectId: -5 }),
    });
    const invalidRes = await teacherSubjectsDelete(invalidReq);
    expect(invalidRes.status).toBe(400);
    expect(mocks.deleteTeacherSubject).not.toHaveBeenCalled();
  });

  it("derives teacher identity strictly from server session when deleting a subject", async () => {
    mocks.requireAuthenticatedTeacher.mockResolvedValue({
      id: "T1001",
      authUserId: "u1",
      name: "Teacher",
      emailId: "t@example.com",
      mobileNumber: "9876543210",
      gender: "male",
    });
    mocks.deleteTeacherSubject.mockResolvedValue({
      ok: true,
      message: 'Subject "AI" (CS101) deleted successfully.',
      data: { id: 42, code: "CS101", name: "AI" },
    });

    const req = new Request("http://localhost:3000/api/teacher/subjects", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subjectId: 42, teacherId: "T9999" }),
    });
    const res = await teacherSubjectsDelete(req);
    expect(res.status).toBe(200);
    expect(mocks.deleteTeacherSubject).toHaveBeenCalledWith("T1001", 42);
  });

  it("denies wrong-role access (student calling teacher attendance save) with 403", async () => {
    mocks.requireAuthenticatedTeacher.mockRejectedValue(
      new AuthorizationError(403, "TEACHER_ROLE_REQUIRED", "Teacher role required")
    );
    const req = new Request("http://localhost:3000/api/teacher/attendance/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const res = await attendanceSavePost(req);
    expect(res.status).toBe(403);
  });

  it("rejects malformed attendance payloads at runtime via Zod", async () => {
    mocks.requireAuthenticatedTeacher.mockResolvedValue({
      id: "T1001",
      authUserId: "u1",
      name: "Teacher",
      emailId: "t@example.com",
      mobileNumber: "9876543210",
      gender: "male",
    });

    const req = new Request("http://localhost:3000/api/teacher/attendance/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subjectId: -1,
        idempotencyKey: "not-a-uuid",
        photoCount: 1,
        entries: [],
      }),
    });
    const res = await attendanceSavePost(req);
    expect(res.status).toBe(400);
    expect(mocks.saveTeacherAttendanceSession).not.toHaveBeenCalled();
  });

  it("derives student actor strictly from server session on enrollment", async () => {
    mocks.requireAuthenticatedStudent.mockResolvedValue({
      id: "S1001",
      authUserId: "u2",
      name: "Student",
      emailId: "s@example.com",
      mobileNumber: "9876543210",
      age: 20,
      gender: "female",
      legacyFaceEmbeddings: [],
    });
    mocks.enrollStudentByCode.mockResolvedValue({
      ok: true,
      message: "You are successfully enrolled in this subject.",
      data: {
        subject: { id: 1, code: "CS101", name: "AI", section: "A" },
        alreadyEnrolled: false,
      },
    });

    const req = new Request("http://localhost:3000/api/student/enroll", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: "CS101", studentId: "S9999" }),
    });
    const res = await studentEnrollPost(req);
    expect(res.status).toBe(200);
    expect(mocks.enrollStudentByCode).toHaveBeenCalledWith("S1001", "CS101");
  });

  it("prevents open redirects in /auth/callback", async () => {
    mocks.exchangeCodeForSession.mockResolvedValue({ error: null });
    const req = new Request(
      "http://localhost:3000/auth/callback?code=abc&next=//evil.example.com"
    );
    const res = await authCallbackGet(req);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3000/");
  });

  it("verifies magic-link token_hash callbacks safely into student dashboard", async () => {
    mocks.verifyOtp.mockResolvedValue({ error: null });
    const req = new Request(
      "http://localhost:3000/auth/callback?token_hash=tok123&type=email&next=/student/dashboard?join-class=CS105"
    );
    const res = await authCallbackGet(req);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(
      "http://localhost:3000/student/dashboard?join-class=CS105"
    );
    expect(mocks.verifyOtp).toHaveBeenCalledWith({
      token_hash: "tok123",
      type: "email",
    });
  });

  it("auto-routes student magic-link callbacks to /student/dashboard when next param is omitted", async () => {
    mocks.exchangeCodeForSession.mockResolvedValue({ error: null });
    mocks.getUser.mockResolvedValue({
      data: {
        user: {
          id: "auth-stu-1",
          email: "student.one@example.com",
          user_metadata: { role: "student" },
        },
      },
    });
    mocks.fromSelectMaybeSingle.mockResolvedValue({
      data: { id: "S1001", name: "student one" },
      error: null,
    });

    const req = new Request("http://localhost:3000/auth/callback?code=pkce-code-123");
    const res = await authCallbackGet(req);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3000/student/dashboard");
  });

  it("redirects failed auth code exchanges with auth_callback_failed error instead of missing_auth_code", async () => {
    mocks.exchangeCodeForSession.mockResolvedValue({
      error: { message: "invalid flow state" },
    });

    const req = new Request(
      "http://localhost:3000/auth/callback?code=expired&next=/student/dashboard"
    );
    const res = await authCallbackGet(req);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(
      "http://localhost:3000/student/login?error=auth_callback_failed"
    );
  });

  it("falls back to magiclink OTP type if email OTP verification rejects a magiclink token", async () => {
    mocks.rpc.mockResolvedValue({
      data: [{ email_id: "student.one@example.com", is_linked: true }],
      error: null,
    });
    mocks.verifyOtp
      .mockResolvedValueOnce({
        data: { user: null },
        error: { message: "Token has expired or is invalid" },
      })
      .mockResolvedValueOnce({
        data: {
          user: {
            id: "auth-u1",
            email: "student.one@example.com",
            user_metadata: {},
          },
        },
        error: null,
      });
    mocks.fromSelectMaybeSingle.mockResolvedValue({
      data: { id: "S1001", name: "student one" },
      error: null,
    });

    const req = new Request("http://localhost:3000/api/auth/student/face-login/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": "10.0.0.4" },
      body: JSON.stringify({ identifier: "S1001", token: "654321" }),
    });

    const res = await faceLoginVerifyOtpPost(req);
    expect(res.status).toBe(200);
    expect(mocks.verifyOtp).toHaveBeenNthCalledWith(1, {
      email: "student.one@example.com",
      token: "654321",
      type: "email",
    });
    expect(mocks.verifyOtp).toHaveBeenNthCalledWith(2, {
      email: "student.one@example.com",
      token: "654321",
      type: "magiclink",
    });
  });
});
