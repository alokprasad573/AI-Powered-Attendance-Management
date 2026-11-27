import "server-only";

import type { SupabaseClient, User } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import { z } from "zod";
import {
  TARGET_BIOMETRIC_CONTRACT,
  validateEmbeddingVector,
} from "@/domain/biometrics";
import { generateStudentId, generateTeacherId } from "@/domain/ids";
import { DEFAULT_MATCHER_CONFIG } from "@/features/face-recognition/engine/matcher";
import { getAppOrigin } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  genderSchema,
  mobileSchema,
  type studentFaceOtpInitiateSchema,
  type studentFaceOtpVerifySchema,
  type studentLoginSchema,
  type studentRegisterSchema,
  type teacherLoginSchema,
  type teacherRegisterSchema,
} from "@/lib/validations/auth";
import type { Database } from "@/types/database";

export type ServiceResult<T> =
  | { ok: true; message: string; data: T }
  | { ok: false; status: number; code: string; message: string };

const SCHEMA_NOT_READY_MESSAGE =
  "Database tables or RPC functions are not initialized in Supabase yet. Run supabase/staging_bootstrap.sql in the Supabase SQL Editor first.";

function isSchemaMissingError(
  error: { code?: string; message?: string } | null | undefined
): boolean {
  if (!error) return false;
  return (
    error.code === "PGRST205" ||
    error.code === "PGRST202" ||
    error.code === "42P01" ||
    error.code === "42883" ||
    Boolean(error.message?.includes("schema cache"))
  );
}

const teacherMetadataSchema = z.object({
  role: z.literal("teacher"),
  profile_id: z.string().regex(/^T\d{4,}$/).optional(),
  name: z.string().trim().min(1).max(120),
  mobile_number: mobileSchema,
  gender: genderSchema,
});

const studentMetadataSchema = z.object({
  role: z.literal("student"),
  profile_id: z.string().regex(/^S\d{4,}$/).optional(),
  name: z.string().trim().min(1).max(120),
  mobile_number: mobileSchema,
  age: z.coerce.number().int().min(5).max(100),
  gender: genderSchema,
});

async function checkRegistrationConflictsRpc(
  supabase: SupabaseClient<Database>,
  role: "teacher" | "student",
  id: string,
  email: string,
  mobileNumber: string
): Promise<
  | { ok: true }
  | { ok: false; status: number; code: string; message: string }
> {
  const { data, error } = await supabase.rpc("check_registration_conflicts", {
    p_role: role,
    p_id: id,
    p_email: email,
    p_mobile: mobileNumber,
  });

  if (error) {
    if (isSchemaMissingError(error)) {
      return {
        ok: false,
        status: 503,
        code: "SCHEMA_NOT_INITIALIZED",
        message: SCHEMA_NOT_READY_MESSAGE,
      };
    }
    return {
      ok: false,
      status: 500,
      code: "DUPLICATE_CHECK_FAILED",
      message: "Unable to validate account uniqueness right now.",
    };
  }

  const row = data?.[0];
  if (row?.id_taken) {
    return {
      ok: false,
      status: 409,
      code: "DUPLICATE_ACCOUNT",
      message: "You are already registered.",
    };
  }
  if (row?.email_taken) {
    return {
      ok: false,
      status: 409,
      code: "DUPLICATE_ACCOUNT",
      message: "This email id is already registered.",
    };
  }
  if (row?.mobile_taken) {
    return {
      ok: false,
      status: 409,
      code: "DUPLICATE_ACCOUNT",
      message: "This mobile number is already registered.",
    };
  }

  return { ok: true };
}

async function ensureTeacherProfileForUser(
  supabase: SupabaseClient<Database>,
  user: User
): Promise<{ id: string; name: string } | null> {
  const { data: existing, error: selectErr } = await supabase
    .from("teachers")
    .select("id, name")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (isSchemaMissingError(selectErr)) {
    throw new Error("SCHEMA_NOT_INITIALIZED");
  }
  if (existing) {
    return existing;
  }

  const { data: claimed } = await supabase.rpc("claim_legacy_profile", {
    p_role: "teacher",
  });
  if (claimed?.[0]?.linked) {
    const { data: afterClaim } = await supabase
      .from("teachers")
      .select("id, name")
      .eq("auth_user_id", user.id)
      .maybeSingle();
    if (afterClaim) {
      return afterClaim;
    }
  }

  const parsedMeta = teacherMetadataSchema.safeParse(user.user_metadata);
  if (!parsedMeta.success || !user.email) {
    return null;
  }

  const profileId = parsedMeta.data.profile_id ?? generateTeacherId();
  const { data: inserted, error: insertErr } = await supabase
    .from("teachers")
    .insert({
      id: profileId,
      name: parsedMeta.data.name.toLowerCase(),
      email_id: user.email.toLowerCase(),
      mobile_number: parsedMeta.data.mobile_number,
      gender: parsedMeta.data.gender,
      password: "supabase-auth-managed",
      auth_user_id: user.id,
    })
    .select("id, name")
    .single();

  if (insertErr || !inserted) {
    return null;
  }

  return inserted;
}

async function ensureStudentProfileForUser(
  supabase: SupabaseClient<Database>,
  user: User
): Promise<{ id: string; name: string } | null> {
  const { data: existing, error: selectErr } = await supabase
    .from("students")
    .select("id, name")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (isSchemaMissingError(selectErr)) {
    throw new Error("SCHEMA_NOT_INITIALIZED");
  }
  if (existing) {
    return existing;
  }

  const { data: claimed } = await supabase.rpc("claim_legacy_profile", {
    p_role: "student",
  });
  if (claimed?.[0]?.linked) {
    const { data: afterClaim } = await supabase
      .from("students")
      .select("id, name")
      .eq("auth_user_id", user.id)
      .maybeSingle();
    if (afterClaim) {
      return afterClaim;
    }
  }

  const parsedMeta = studentMetadataSchema.safeParse(user.user_metadata);
  if (!parsedMeta.success || !user.email) {
    return null;
  }

  const profileId = parsedMeta.data.profile_id ?? generateStudentId();
  const { data: inserted, error: insertErr } = await supabase
    .from("students")
    .insert({
      id: profileId,
      name: parsedMeta.data.name.toLowerCase(),
      email_id: user.email.toLowerCase(),
      mobile_number: parsedMeta.data.mobile_number,
      age: parsedMeta.data.age,
      gender: parsedMeta.data.gender,
      auth_user_id: user.id,
    })
    .select("id, name")
    .single();

  if (insertErr || !inserted) {
    return null;
  }

  return inserted;
}

/**
 * Called by /auth/callback after email verification so confirmed users
 * have their profile row created or legacy row linked automatically.
 * Returns the verified account role when available so fallback callbacks
 * can route directly to the right dashboard.
 */
export async function ensureAuthenticatedProfileAfterCallback(
  supabase: SupabaseClient<Database>
): Promise<"teacher" | "student" | null> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const metaRole =
      typeof user.user_metadata?.role === "string"
        ? user.user_metadata.role
        : null;

    if (metaRole === "teacher") {
      const teacher = await ensureTeacherProfileForUser(supabase, user);
      return teacher ? "teacher" : null;
    }
    if (metaRole === "student") {
      const student = await ensureStudentProfileForUser(supabase, user);
      return student ? "student" : null;
    }

    const [studentProfile, teacherProfile] = await Promise.all([
      ensureStudentProfileForUser(supabase, user),
      ensureTeacherProfileForUser(supabase, user),
    ]);
    if (studentProfile) return "student";
    if (teacherProfile) return "teacher";
    return null;
  } catch {
    // Do not block auth callback redirect if profile already exists or schema awaits init.
    return null;
  }
}

export async function registerTeacherAccount(
  input: z.infer<typeof teacherRegisterSchema>,
  requestOrigin?: string
): Promise<
  ServiceResult<{
    teacherId: string;
    email: string;
    requiresEmailConfirmation: boolean;
  }>
> {
  const teacherId = input.teacherId ?? generateTeacherId();
  const normalizedName = input.name.trim().toLowerCase();
  const normalizedGender = input.gender;
  const origin = getAppOrigin(requestOrigin);

  try {
    const supabase = await createServerSupabaseClient();
    const conflictCheck = await checkRegistrationConflictsRpc(
      supabase,
      "teacher",
      teacherId,
      input.email,
      input.mobileNumber
    );
    if (!conflictCheck.ok) {
      return conflictCheck;
    }

    const { data: authData, error: authErr } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent("/teacher/dashboard")}`,
        data: {
          role: "teacher",
          profile_id: teacherId,
          name: normalizedName,
          mobile_number: input.mobileNumber,
          gender: normalizedGender,
        },
      },
    });

    if (authErr || !authData.user) {
      return {
        ok: false,
        status: 400,
        code: "AUTH_USER_CREATE_FAILED",
        message: authErr?.message ?? "Could not create Supabase Auth account.",
      };
    }

    if (
      Array.isArray(authData.user.identities) &&
      authData.user.identities.length === 0
    ) {
      return {
        ok: false,
        status: 409,
        code: "DUPLICATE_ACCOUNT",
        message: "This email id is already registered.",
      };
    }

    if (authData.session) {
      const passwordHash = await bcrypt.hash(input.password, 10);
      const { error: insertErr } = await supabase.from("teachers").insert({
        id: teacherId,
        name: normalizedName,
        email_id: input.email,
        mobile_number: input.mobileNumber,
        gender: normalizedGender,
        password: passwordHash,
        auth_user_id: authData.user.id,
      });

      await supabase.auth.signOut();

      // If trigger already inserted the row, PostgreSQL returns 23505 (unique_violation)
      // which is totally fine since the row is already successfully saved.
      if (insertErr && insertErr.code !== "23505") {
        if (isSchemaMissingError(insertErr)) {
          return {
            ok: false,
            status: 503,
            code: "SCHEMA_NOT_INITIALIZED",
            message: SCHEMA_NOT_READY_MESSAGE,
          };
        }
        return {
          ok: false,
          status: 500,
          code: "TEACHER_INSERT_FAILED",
          message: "Failed to save teacher profile. Please retry.",
        };
      }

      return {
        ok: true,
        message: `Success! Your teacher account has been created. Teacher ID is ${teacherId}. Please login now.`,
        data: {
          teacherId,
          email: input.email,
          requiresEmailConfirmation: false,
        },
      };
    }

    return {
      ok: true,
      message: `Account created (Teacher ID: ${teacherId}). Confirm the verification link sent to ${input.email}, then sign in.`,
      data: {
        teacherId,
        email: input.email,
        requiresEmailConfirmation: true,
      },
    };
  } catch {
    return {
      ok: false,
      status: 500,
      code: "TEACHER_REGISTRATION_ERROR",
      message: "Unexpected error during teacher registration.",
    };
  }
}

export async function loginTeacherAccount(
  input: z.infer<typeof teacherLoginSchema>,
  requestOrigin?: string
): Promise<ServiceResult<{ teacherId: string; name: string }>> {
  const identifier = input.identifier.trim();
  const isEmail = identifier.includes("@");
  const supabase = await createServerSupabaseClient();

  try {
    const { data: lookupRows, error: lookupErr } = await supabase.rpc(
      "resolve_login_identifier",
      {
        p_role: "teacher",
        p_identifier: identifier,
      }
    );

    if (lookupErr) {
      if (isSchemaMissingError(lookupErr)) {
        return {
          ok: false,
          status: 503,
          code: "SCHEMA_NOT_INITIALIZED",
          message: SCHEMA_NOT_READY_MESSAGE,
        };
      }
      return {
        ok: false,
        status: 500,
        code: "TEACHER_LOOKUP_FAILED",
        message: "Unable to resolve teacher account right now.",
      };
    }

    const resolved = lookupRows?.[0];
    if (!resolved && !isEmail) {
      return {
        ok: false,
        status: 401,
        code: "TEACHER_NOT_FOUND",
        message: "Teacher ID not found. Please register first.",
      };
    }

    // Legacy unlinked bcrypt teacher path (verified inside Postgres pgcrypto, never sent to browser)
    if (resolved && !resolved.is_linked) {
      const { data: legacyRows, error: verifyErr } = await supabase.rpc(
        "verify_legacy_teacher_password",
        {
          p_identifier: identifier,
          p_password: input.password,
        }
      );

      const legacyMatch = legacyRows?.[0];
      if (verifyErr || !legacyMatch?.verified || !legacyMatch.email_id) {
        return {
          ok: false,
          status: 401,
          code: "INVALID_CREDENTIALS",
          message: "Incorrect password.",
        };
      }

      const origin = getAppOrigin(requestOrigin);
      const { data: upgradeData } = await supabase.auth.signUp({
        email: legacyMatch.email_id,
        password: input.password,
        options: {
          emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent("/teacher/dashboard")}`,
          data: {
            role: "teacher",
            profile_id: legacyMatch.teacher_id,
          },
        },
      });

      if (upgradeData.session && upgradeData.user) {
        await supabase.rpc("claim_legacy_profile", { p_role: "teacher" });
        const profile = await ensureTeacherProfileForUser(
          supabase,
          upgradeData.user
        );
        if (profile) {
          return {
            ok: true,
            message: `Welcome back, ${profile.name}! Your account has been upgraded to Supabase Auth.`,
            data: { teacherId: profile.id, name: profile.name },
          };
        }
      }

      if (
        upgradeData.user &&
        Array.isArray(upgradeData.user.identities) &&
        upgradeData.user.identities.length === 0
      ) {
        const { data: signInExisting, error: signInExistingErr } =
          await supabase.auth.signInWithPassword({
            email: legacyMatch.email_id,
            password: input.password,
          });
        if (!signInExistingErr && signInExisting.user) {
          const profile = await ensureTeacherProfileForUser(
            supabase,
            signInExisting.user
          );
          if (profile) {
            return {
              ok: true,
              message: `Welcome back, ${profile.name}!`,
              data: { teacherId: profile.id, name: profile.name },
            };
          }
        }
        return {
          ok: false,
          status: 409,
          code: "LEGACY_LINK_FAILED",
          message:
            "An Auth user already exists for this email. Use Password Recovery to claim your teacher account.",
        };
      }

      return {
        ok: false,
        status: 403,
        code: "LEGACY_CONFIRM_EMAIL_SENT",
        message:
          "Legacy password verified! Click the verification link sent to your email address to activate Supabase Auth, then sign in again.",
      };
    }

    const targetEmail = resolved
      ? resolved.email_id
      : identifier.toLowerCase();

    const { data: signInData, error: signInErr } =
      await supabase.auth.signInWithPassword({
        email: targetEmail,
        password: input.password,
      });

    if (signInErr || !signInData.user) {
      return {
        ok: false,
        status: 401,
        code: "INVALID_CREDENTIALS",
        message: signInErr?.message?.includes("Email not confirmed")
          ? "Please confirm your email address before signing in."
          : "Incorrect Teacher ID, email, or password.",
      };
    }

    const profile = await ensureTeacherProfileForUser(supabase, signInData.user);
    if (!profile) {
      await supabase.auth.signOut();
      return {
        ok: false,
        status: 403,
        code: "NOT_A_TEACHER",
        message: "This account is not linked to a teacher profile.",
      };
    }

    return {
      ok: true,
      message: `Welcome back, ${profile.name}!`,
      data: { teacherId: profile.id, name: profile.name },
    };
  } catch (err) {
    if (err instanceof Error && err.message === "SCHEMA_NOT_INITIALIZED") {
      return {
        ok: false,
        status: 503,
        code: "SCHEMA_NOT_INITIALIZED",
        message: SCHEMA_NOT_READY_MESSAGE,
      };
    }
    return {
      ok: false,
      status: 500,
      code: "TEACHER_LOGIN_ERROR",
      message: "Unexpected error during teacher login.",
    };
  }
}

export async function registerStudentAccount(
  input: z.infer<typeof studentRegisterSchema>,
  requestOrigin?: string
): Promise<
  ServiceResult<{
    studentId: string;
    email: string;
    requiresEmailConfirmation: boolean;
  }>
> {
  const studentId = input.studentId ?? generateStudentId();
  const normalizedName = input.name.trim().toLowerCase();
  const origin = getAppOrigin(requestOrigin);

  if (input.faceTemplate) {
    const vectorCheck = validateEmbeddingVector(
      input.faceTemplate.vector,
      input.faceTemplate.embeddingDimension
    );
    if (!vectorCheck.valid) {
      return {
        ok: false,
        status: 400,
        code: "INVALID_BIOMETRIC_TEMPLATE",
        message: vectorCheck.reason,
      };
    }
  }

  try {
    const supabase = await createServerSupabaseClient();
    const conflictCheck = await checkRegistrationConflictsRpc(
      supabase,
      "student",
      studentId,
      input.email,
      input.mobileNumber
    );
    if (!conflictCheck.ok) {
      return conflictCheck;
    }

    const { data: authData, error: authErr } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent("/student/dashboard")}`,
        data: {
          role: "student",
          profile_id: studentId,
          name: normalizedName,
          mobile_number: input.mobileNumber,
          age: input.age,
          gender: input.gender,
        },
      },
    });

    if (authErr || !authData.user) {
      return {
        ok: false,
        status: 400,
        code: "AUTH_USER_CREATE_FAILED",
        message: authErr?.message ?? "Could not create Supabase Auth account.",
      };
    }

    if (
      Array.isArray(authData.user.identities) &&
      authData.user.identities.length === 0
    ) {
      return {
        ok: false,
        status: 409,
        code: "DUPLICATE_ACCOUNT",
        message: "This email id is already registered.",
      };
    }

    if (authData.session) {
      const { error: insertErr } = await supabase.from("students").insert({
        id: studentId,
        name: normalizedName,
        email_id: input.email,
        mobile_number: input.mobileNumber,
        age: input.age,
        gender: input.gender,
        auth_user_id: authData.user.id,
      });

      if (insertErr && insertErr.code !== "23505") {
        await supabase.auth.signOut();
        if (isSchemaMissingError(insertErr)) {
          return {
            ok: false,
            status: 503,
            code: "SCHEMA_NOT_INITIALIZED",
            message: SCHEMA_NOT_READY_MESSAGE,
          };
        }
        return {
          ok: false,
          status: 500,
          code: "STUDENT_INSERT_FAILED",
          message: "Failed to save student profile.",
        };
      }

      let templateSaved = true;
      if (input.faceTemplate) {
        const { error: tplErr } = await supabase
          .from("student_face_templates")
          .insert({
            student_id: studentId,
            model_id: input.faceTemplate.modelId,
            model_version: input.faceTemplate.modelVersion,
            preprocessing_version: input.faceTemplate.preprocessingVersion,
            embedding_dimension: input.faceTemplate.embeddingDimension,
            vector: input.faceTemplate.vector,
            is_active: true,
          });
        if (tplErr) {
          templateSaved = false;
        }
      }

      await supabase.auth.signOut();

      return {
        ok: true,
        message: templateSaved
          ? `Success! Your student account has been created. Student ID is ${studentId}. Please login now.`
          : `Account created (${studentId}), but biometric template could not be saved yet. Enroll your face in the student dashboard.`,
        data: {
          studentId,
          email: input.email,
          requiresEmailConfirmation: false,
        },
      };
    }

    return {
      ok: true,
      message: input.faceTemplate
        ? `Account created (Student ID: ${studentId}). Confirm the email link sent to ${input.email}, sign in, and save your face template in the dashboard.`
        : `Account created (Student ID: ${studentId}). Confirm the email link sent to ${input.email}, then sign in.`,
      data: {
        studentId,
        email: input.email,
        requiresEmailConfirmation: true,
      },
    };
  } catch {
    return {
      ok: false,
      status: 500,
      code: "STUDENT_REGISTRATION_ERROR",
      message: "Unexpected error during student registration.",
    };
  }
}

export async function loginStudentAccount(
  input: z.infer<typeof studentLoginSchema>
): Promise<ServiceResult<{ studentId: string; name: string }>> {
  const identifier = input.identifier.trim();
  const isEmail = identifier.includes("@");
  const supabase = await createServerSupabaseClient();

  try {
    const { data: lookupRows, error: lookupErr } = await supabase.rpc(
      "resolve_login_identifier",
      {
        p_role: "student",
        p_identifier: identifier,
      }
    );

    if (lookupErr) {
      if (isSchemaMissingError(lookupErr)) {
        return {
          ok: false,
          status: 503,
          code: "SCHEMA_NOT_INITIALIZED",
          message: SCHEMA_NOT_READY_MESSAGE,
        };
      }
      return {
        ok: false,
        status: 500,
        code: "STUDENT_LOOKUP_FAILED",
        message: "Unable to resolve student account right now.",
      };
    }

    const resolved = lookupRows?.[0];
    if (!resolved && !isEmail) {
      return {
        ok: false,
        status: 401,
        code: "STUDENT_NOT_FOUND",
        message: "Student ID not found. Please register first.",
      };
    }

    if (resolved && !resolved.is_linked) {
      return {
        ok: false,
        status: 409,
        code: "STUDENT_PASSWORD_MIGRATION_REQUIRED",
        message:
          "Legacy face-only student accounts require a confirmed Supabase Auth password. Register or reset via your school email to link this profile.",
      };
    }

    const targetEmail = resolved
      ? resolved.email_id
      : identifier.toLowerCase();

    const { data: signInData, error: signInErr } =
      await supabase.auth.signInWithPassword({
        email: targetEmail,
        password: input.password,
      });

    if (signInErr || !signInData.user) {
      return {
        ok: false,
        status: 401,
        code: "INVALID_CREDENTIALS",
        message: signInErr?.message?.includes("Email not confirmed")
          ? "Please confirm your email address before signing in."
          : "Incorrect Student ID, email, or password.",
      };
    }

    const profile = await ensureStudentProfileForUser(supabase, signInData.user);
    if (!profile) {
      await supabase.auth.signOut();
      return {
        ok: false,
        status: 403,
        code: "NOT_A_STUDENT",
        message: "This account is not linked to a student profile.",
      };
    }

    return {
      ok: true,
      message: `Welcome back, ${profile.name}!`,
      data: { studentId: profile.id, name: profile.name },
    };
  } catch (err) {
    if (err instanceof Error && err.message === "SCHEMA_NOT_INITIALIZED") {
      return {
        ok: false,
        status: 503,
        code: "SCHEMA_NOT_INITIALIZED",
        message: SCHEMA_NOT_READY_MESSAGE,
      };
    }
    return {
      ok: false,
      status: 500,
      code: "STUDENT_LOGIN_ERROR",
      message: "Unexpected error during student login.",
    };
  }
}

export function maskEmailAddress(email: string): string {
  const [localPart, domain] = email.split("@");
  if (!localPart || !domain) {
    return "***";
  }
  if (localPart.length <= 2) {
    return `${localPart[0] ?? "*"}***@${domain}`;
  }
  return `${localPart[0]}***${localPart[localPart.length - 1]}@${domain}`;
}

export async function initiateStudentFaceOtpLogin(
  input: z.infer<typeof studentFaceOtpInitiateSchema>,
  requestOrigin?: string
): Promise<
  ServiceResult<{
    studentId: string;
    maskedEmail: string;
    otpSent: true;
  }>
> {
  if (
    input.modelId !== TARGET_BIOMETRIC_CONTRACT.modelId ||
    input.modelVersion !== TARGET_BIOMETRIC_CONTRACT.modelVersion ||
    input.preprocessingVersion !== TARGET_BIOMETRIC_CONTRACT.preprocessingVersion ||
    input.embeddingDimension !== TARGET_BIOMETRIC_CONTRACT.expectedDimension
  ) {
    return {
      ok: false,
      status: 400,
      code: "INCOMPATIBLE_BIOMETRIC_MODEL",
      message:
        "Face scan model metadata does not match the active SFace biometric contract. Refresh and retry.",
    };
  }

  const vectorCheck = validateEmbeddingVector(
    input.vector,
    TARGET_BIOMETRIC_CONTRACT.expectedDimension
  );
  if (!vectorCheck.valid) {
    return {
      ok: false,
      status: 400,
      code: "INVALID_BIOMETRIC_VECTOR",
      message: vectorCheck.reason,
    };
  }

  const supabase = await createServerSupabaseClient();
  const origin = getAppOrigin(requestOrigin);

  try {
    const { data: verifyRows, error: rpcErr } = await supabase.rpc(
      "verify_student_face_for_otp",
      {
        p_identifier: input.identifier.trim(),
        p_model_id: input.modelId,
        p_model_version: input.modelVersion,
        p_preprocessing_version: input.preprocessingVersion,
        p_embedding_dimension: input.embeddingDimension,
        p_probe_vector: input.vector,
        p_min_similarity: DEFAULT_MATCHER_CONFIG.cosineThreshold,
      }
    );

    if (rpcErr) {
      if (isSchemaMissingError(rpcErr)) {
        return {
          ok: false,
          status: 503,
          code: "SCHEMA_NOT_INITIALIZED",
          message: SCHEMA_NOT_READY_MESSAGE,
        };
      }
      return {
        ok: false,
        status: 500,
        code: "FACE_VERIFY_RPC_FAILED",
        message: "Unable to verify face template right now. Please retry.",
      };
    }

    const match = verifyRows?.[0];
    if (!match || !match.verified || !match.email_id || !match.student_id) {
      if (match?.reason === "account_not_activated") {
        return {
          ok: false,
          status: 403,
          code: "LEGACY_ACCOUNT_REQUIRES_ACTIVATION",
          message:
            "This legacy student account needs activation first. Use 'Activate legacy / Reset password' in the Credentials tab.",
        };
      }
      if (match?.reason === "no_face_template") {
        return {
          ok: false,
          status: 404,
          code: "NO_FACE_TEMPLATE_ENROLLED",
          message:
            "No active face template is enrolled for this student yet. Sign in with Credentials first and enroll your face in the Student Dashboard.",
        };
      }
      return {
        ok: false,
        status: 401,
        code: "FACE_VERIFICATION_FAILED",
        message:
          "Face verification failed. Check your Student ID / Email, ensure clear front-facing lighting, and try again.",
      };
    }

    const nextPath = input.joinCode
      ? `/student/dashboard?join-class=${encodeURIComponent(input.joinCode)}`
      : "/student/dashboard";

    const { error: otpErr } = await supabase.auth.signInWithOtp({
      email: match.email_id,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
      },
    });

    if (otpErr) {
      const lowerMsg = otpErr.message.toLowerCase();
      const isRateLimit =
        lowerMsg.includes("rate limit") || lowerMsg.includes("too many");
      return {
        ok: false,
        status: isRateLimit ? 429 : 502,
        code: isRateLimit ? "OTP_RATE_LIMITED" : "OTP_DISPATCH_FAILED",
        message: isRateLimit
          ? "Too many verification emails requested. Please wait a minute before retrying."
          : "Face matched, but we could not send the email verification code right now. Please retry or use Credentials login.",
      };
    }

    const maskedEmail = maskEmailAddress(match.email_id);
    return {
      ok: true,
      message: `Face verified! Open the email sent to ${maskedEmail} and click the Sign-In Link — or enter the 6-digit OTP code if shown in your email.`,
      data: {
        studentId: match.student_id,
        maskedEmail,
        otpSent: true,
      },
    };
  } catch {
    return {
      ok: false,
      status: 500,
      code: "FACE_OTP_INITIATE_ERROR",
      message: "Unexpected error during face verification login.",
    };
  }
}

export async function verifyStudentFaceOtpLogin(
  input: z.infer<typeof studentFaceOtpVerifySchema>
): Promise<ServiceResult<{ studentId: string; name: string }>> {
  const identifier = input.identifier.trim();
  const isEmail = identifier.includes("@");
  const supabase = await createServerSupabaseClient();

  try {
    const { data: lookupRows, error: lookupErr } = await supabase.rpc(
      "resolve_login_identifier",
      {
        p_role: "student",
        p_identifier: identifier,
      }
    );

    if (lookupErr) {
      if (isSchemaMissingError(lookupErr)) {
        return {
          ok: false,
          status: 503,
          code: "SCHEMA_NOT_INITIALIZED",
          message: SCHEMA_NOT_READY_MESSAGE,
        };
      }
      return {
        ok: false,
        status: 500,
        code: "IDENTIFIER_LOOKUP_FAILED",
        message: "Unable to verify student account right now.",
      };
    }

    const resolved = lookupRows?.[0];
    if (!resolved && !isEmail) {
      return {
        ok: false,
        status: 401,
        code: "INVALID_OTP",
        message: "Invalid or expired verification code.",
      };
    }

    const targetEmail = resolved
      ? resolved.email_id
      : identifier.toLowerCase();

    const trimmedToken = input.token.trim();
    let { data: verifyData, error: verifyErr } = await supabase.auth.verifyOtp({
      email: targetEmail,
      token: trimmedToken,
      type: "email",
    });

    // Some Supabase Auth templates/configurations validate signInWithOtp codes under "magiclink".
    if (verifyErr || !verifyData.user) {
      const magicFallback = await supabase.auth.verifyOtp({
        email: targetEmail,
        token: trimmedToken,
        type: "magiclink",
      });
      if (!magicFallback.error && magicFallback.data.user) {
        verifyData = magicFallback.data;
        verifyErr = null;
      }
    }

    if (verifyErr || !verifyData.user) {
      return {
        ok: false,
        status: 401,
        code: "INVALID_OTP",
        message:
          "Invalid or expired verification code. Click the Sign-In Link in your email, enter the latest 6-digit OTP code, or scan your face again.",
      };
    }

    const profile = await ensureStudentProfileForUser(supabase, verifyData.user);
    if (!profile) {
      await supabase.auth.signOut();
      return {
        ok: false,
        status: 403,
        code: "NOT_A_STUDENT",
        message: "This account is not linked to a student profile.",
      };
    }

    return {
      ok: true,
      message: `Welcome back, ${profile.name}!`,
      data: { studentId: profile.id, name: profile.name },
    };
  } catch (err) {
    if (err instanceof Error && err.message === "SCHEMA_NOT_INITIALIZED") {
      return {
        ok: false,
        status: 503,
        code: "SCHEMA_NOT_INITIALIZED",
        message: SCHEMA_NOT_READY_MESSAGE,
      };
    }
    return {
      ok: false,
      status: 500,
      code: "STUDENT_OTP_VERIFY_ERROR",
      message: "Unexpected error while verifying sign-in code.",
    };
  }
}

export async function requestPasswordRecovery(
  email: string,
  role: "teacher" | "student",
  requestOrigin?: string
): Promise<ServiceResult<null>> {
  const supabase = await createServerSupabaseClient();
  const origin = getAppOrigin(requestOrigin);
  const nextPath =
    role === "teacher" ? "/teacher/dashboard" : "/student/dashboard";

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
  });

  if (error) {
    return {
      ok: false,
      status: 400,
      code: "RECOVERY_FAILED",
      message: "Unable to send password recovery email right now.",
    };
  }

  return {
    ok: true,
    message:
      "If an account exists for that email address, a password recovery link has been sent.",
    data: null,
  };
}

export async function logoutCurrentSession(): Promise<void> {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
}
