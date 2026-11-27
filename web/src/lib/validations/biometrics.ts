import { versionedTemplateInputSchema } from "./auth";

export const upsertStudentTemplateSchema = versionedTemplateInputSchema.refine(
  (data) => data.vector.length === data.embeddingDimension,
  {
    message: "Vector length must match embeddingDimension.",
    path: ["vector"],
  }
);
