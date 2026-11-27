import "server-only";

import {
  classifyStudentBiometricState,
  validateEmbeddingVector,
  type StudentBiometricState,
  type VersionedTemplateRecord,
} from "@/domain/biometrics";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ServiceResult } from "./auth.service";

export interface StudentBiometricOverview {
  state: StudentBiometricState;
  activeTemplates: VersionedTemplateRecord[];
}

export async function getStudentBiometricOverview(
  studentId: string,
  legacyFaceEmbeddings: unknown
): Promise<StudentBiometricOverview> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("student_face_templates")
    .select(
      "id, student_id, model_id, model_version, preprocessing_version, embedding_dimension, is_active, consent_granted_at"
    )
    .eq("student_id", studentId)
    .eq("is_active", true);

  const activeTemplates: VersionedTemplateRecord[] = (data ?? []).map((row) => ({
    id: row.id,
    studentId: row.student_id,
    modelId: row.model_id,
    modelVersion: row.model_version,
    preprocessingVersion: row.preprocessing_version,
    embeddingDimension: row.embedding_dimension,
    isActive: row.is_active,
    consentGrantedAt: row.consent_granted_at,
  }));

  return {
    state: classifyStudentBiometricState({
      activeTemplates,
      legacyFaceEmbeddings,
    }),
    activeTemplates,
  };
}

export async function upsertStudentFaceTemplate(
  studentId: string,
  input: {
    modelId: string;
    modelVersion: string;
    preprocessingVersion: string;
    embeddingDimension: number;
    vector: number[];
  }
): Promise<ServiceResult<{ templateId: string }>> {
  const vectorCheck = validateEmbeddingVector(input.vector, input.embeddingDimension);
  if (!vectorCheck.valid) {
    return {
      ok: false,
      status: 400,
      code: "INVALID_TEMPLATE_VECTOR",
      message: vectorCheck.reason,
    };
  }

  const supabase = await createServerSupabaseClient();

  await supabase
    .from("student_face_templates")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("student_id", studentId)
    .eq("model_id", input.modelId)
    .eq("is_active", true);

  const { data, error } = await supabase
    .from("student_face_templates")
    .insert({
      student_id: studentId,
      model_id: input.modelId,
      model_version: input.modelVersion,
      preprocessing_version: input.preprocessingVersion,
      embedding_dimension: input.embeddingDimension,
      vector: input.vector,
      is_active: true,
      consent_granted_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error || !data) {
    return {
      ok: false,
      status: 400,
      code: "TEMPLATE_SAVE_FAILED",
      message: "Failed to store versioned biometric template.",
    };
  }

  return {
    ok: true,
    message: "Biometric face template enrolled successfully.",
    data: { templateId: data.id },
  };
}
