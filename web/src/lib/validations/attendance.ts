import { z } from "zod";
import { studentIdSchema } from "./auth";

export const attendanceSaveEntrySchema = z.object({
  student_id: studentIdSchema,
  is_present: z.boolean(),
  source_photos: z.array(z.string().trim().min(1).max(64)).max(50),
  is_manual_override: z.boolean(),
});

export const saveAttendanceSessionSchema = z.object({
  subjectId: z.coerce.number().int().positive("Subject ID must be positive."),
  idempotencyKey: z.string().uuid("Idempotency key must be a valid UUID."),
  photoCount: z.coerce.number().int().min(0).max(50),
  entries: z
    .array(attendanceSaveEntrySchema)
    .min(1, "At least one enrolled student entry is required.")
    .max(1000),
});

export const rosterQuerySchema = z.object({
  subjectId: z.coerce.number().int().positive("Subject ID must be positive."),
});
