import { z } from "zod";

export const genderSchema = z.enum(["male", "female", "other"], {
  error: "Please select a valid gender (Male, Female, or Other).",
});

export const mobileSchema = z
  .string()
  .trim()
  .regex(/^\d{10}$/, "Mobile number must be exactly 10 digits.");

export const teacherIdSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^T\d{4,}$/, "Teacher ID must start with 'T' followed by digits (e.g. T4567).");

export const studentIdSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^S\d{4,}$/, "Student ID must start with 'S' followed by digits (e.g. S1234).");

export const teacherRegisterSchema = z
  .object({
    teacherId: teacherIdSchema.optional(),
    name: z.string().trim().min(2, "Full name is required.").max(120),
    email: z.string().trim().email("Please enter a valid email address.").toLowerCase(),
    mobileNumber: mobileSchema,
    gender: genderSchema,
    password: z.string().min(6, "Password must be at least 6 characters long.").max(128),
    confirmPassword: z.string().min(6, "Please confirm your password.").max(128),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match. Please try again.",
    path: ["confirmPassword"],
  });

export const teacherLoginSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(3, "Please enter your Teacher ID or Email address.")
    .max(120),
  password: z.string().min(1, "Please enter your password.").max(128),
});

export const versionedTemplateInputSchema = z.object({
  modelId: z.string().trim().min(2).max(100),
  modelVersion: z.string().trim().min(1).max(64),
  preprocessingVersion: z.string().trim().min(1).max(64),
  embeddingDimension: z.number().int().positive().max(2048),
  vector: z.array(z.number().finite()).min(1).max(2048),
  consentAccepted: z.literal(true, {
    error: "Explicit biometric enrollment consent is required.",
  }),
});

export const studentRegisterSchema = z.object({
  studentId: studentIdSchema.optional(),
  name: z.string().trim().min(2, "Full name is required.").max(120),
  email: z.string().trim().email("Please enter a valid email address.").toLowerCase(),
  mobileNumber: mobileSchema,
  age: z.coerce
    .number()
    .int("Age must be a whole number.")
    .min(5, "Age must be between 5 and 100.")
    .max(100, "Age must be between 5 and 100."),
  gender: genderSchema,
  password: z.string().min(6, "Password must be at least 6 characters long.").max(128),
  confirmPassword: z.string().min(6, "Please confirm your password.").max(128),
  faceTemplate: versionedTemplateInputSchema.optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match. Please try again.",
  path: ["confirmPassword"],
});

export const studentLoginSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(3, "Please enter your Student ID or Email address.")
    .max(120),
  password: z.string().min(1, "Please enter your password.").max(128),
});

export const studentFaceOtpInitiateSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(3, "Please enter your Student ID or Email address before scanning.")
    .max(120),
  modelId: z.string().trim().min(2).max(100),
  modelVersion: z.string().trim().min(1).max(64),
  preprocessingVersion: z.string().trim().min(1).max(64),
  embeddingDimension: z.number().int().positive().max(2048),
  vector: z.array(z.number().finite()).min(1).max(2048),
  joinCode: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9_-]{2,32}$/)
    .optional(),
});

export const studentFaceOtpVerifySchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(3, "Student ID or Email address is required.")
    .max(120),
  token: z
    .string()
    .trim()
    .regex(/^\d{6,10}$/, "Please enter the numeric verification code sent to your email."),
});

export const passwordRecoverySchema = z.object({
  email: z.string().trim().email("Please enter a valid registered email address.").toLowerCase(),
  role: z.enum(["teacher", "student"]),
});
