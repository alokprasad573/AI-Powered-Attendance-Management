import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export interface AuthenticatedTeacher {
  authUserId: string;
  id: string;
  name: string;
  emailId: string;
  mobileNumber: string;
  gender: string;
}

export interface AuthenticatedStudent {
  authUserId: string;
  id: string;
  name: string;
  emailId: string;
  mobileNumber: string;
  age: number;
  gender: string;
  legacyFaceEmbeddings: unknown;
}

export class AuthorizationError extends Error {
  readonly status: 401 | 403;
  readonly code: string;

  constructor(status: 401 | 403, code: string, message: string) {
    super(message);
    this.name = "AuthorizationError";
    this.status = status;
    this.code = code;
  }
}

export async function getOptionalAuthenticatedTeacher(): Promise<AuthenticatedTeacher | null> {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return null;
    }

    const { data, error } = await supabase
      .from("teachers")
      .select("id, name, email_id, mobile_number, gender, auth_user_id")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (error || !data || !data.auth_user_id) {
      return null;
    }

    return {
      authUserId: data.auth_user_id,
      id: data.id,
      name: data.name,
      emailId: data.email_id,
      mobileNumber: data.mobile_number,
      gender: data.gender,
    };
  } catch {
    return null;
  }
}

export async function requireAuthenticatedTeacher(): Promise<AuthenticatedTeacher> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new AuthorizationError(
      401,
      "UNAUTHENTICATED",
      "Authentication required. Please sign in to the Teacher Portal."
    );
  }

  const { data, error } = await supabase
    .from("teachers")
    .select("id, name, email_id, mobile_number, gender, auth_user_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (error || !data || !data.auth_user_id) {
    throw new AuthorizationError(
      403,
      "TEACHER_ROLE_REQUIRED",
      "Authenticated account is not linked to a teacher profile."
    );
  }

  return {
    authUserId: data.auth_user_id,
    id: data.id,
    name: data.name,
    emailId: data.email_id,
    mobileNumber: data.mobile_number,
    gender: data.gender,
  };
}

export async function getOptionalAuthenticatedStudent(): Promise<AuthenticatedStudent | null> {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return null;
    }

    const { data, error } = await supabase
      .from("students")
      .select(
        "id, name, email_id, mobile_number, age, gender, auth_user_id"
      )
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (error || !data || !data.auth_user_id) {
      return null;
    }

    return {
      authUserId: data.auth_user_id,
      id: data.id,
      name: data.name,
      emailId: data.email_id,
      mobileNumber: data.mobile_number,
      age: data.age,
      gender: data.gender,
      legacyFaceEmbeddings: [],
    };
  } catch {
    return null;
  }
}

export async function requireAuthenticatedStudent(): Promise<AuthenticatedStudent> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new AuthorizationError(
      401,
      "UNAUTHENTICATED",
      "Authentication required. Please sign in to the Student Portal."
    );
  }

  const { data, error } = await supabase
    .from("students")
    .select(
      "id, name, email_id, mobile_number, age, gender, auth_user_id"
    )
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (error || !data || !data.auth_user_id) {
    throw new AuthorizationError(
      403,
      "STUDENT_ROLE_REQUIRED",
      "Authenticated account is not linked to a student profile."
    );
  }

  return {
    authUserId: data.auth_user_id,
    id: data.id,
    name: data.name,
    emailId: data.email_id,
    mobileNumber: data.mobile_number,
    age: data.age,
    gender: data.gender,
    legacyFaceEmbeddings: [],
  };
}
