import { z } from "zod";

export const subjectCodeSchema = z
  .string()
  .trim()
  .min(2, "Subject code must be at least 2 characters.")
  .max(32, "Subject code cannot exceed 32 characters.")
  .regex(
    /^[A-Za-z0-9_-]+$/,
    "Subject code may contain only letters, numbers, hyphens, and underscores."
  );

export const createSubjectSchema = z.object({
  code: subjectCodeSchema,
  name: z
    .string()
    .trim()
    .min(2, "Subject name is required.")
    .max(120, "Subject name cannot exceed 120 characters."),
  section: z
    .string()
    .trim()
    .min(1, "Section is required.")
    .max(24, "Section cannot exceed 24 characters."),
});

export const enrollByCodeSchema = z.object({
  code: subjectCodeSchema,
});

export const unenrollSubjectSchema = z.object({
  subjectId: z.coerce.number().int().positive("Invalid subject ID."),
});

export const deleteSubjectSchema = z.object({
  subjectId: z.coerce.number().int().positive("Invalid subject ID."),
});
