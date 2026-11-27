import { NextResponse } from "next/server";
import { upsertStudentTemplateSchema } from "@/lib/validations/biometrics";
import {
  AuthorizationError,
  requireAuthenticatedStudent,
} from "@/services/session-guard";
import {
  getStudentBiometricOverview,
  upsertStudentFaceTemplate,
} from "@/services/templates.service";

export async function GET() {
  try {
    const student = await requireAuthenticatedStudent();
    const overview = await getStudentBiometricOverview(
      student.id,
      student.legacyFaceEmbeddings
    );
    return NextResponse.json({ ok: true, ...overview }, { status: 200 });
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return NextResponse.json(
        { ok: false, code: err.code, message: err.message },
        { status: err.status }
      );
    }
    return NextResponse.json(
      { ok: false, code: "TEMPLATE_STATUS_ERROR", message: "Unable to inspect biometric status." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const student = await requireAuthenticatedStudent();

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { ok: false, code: "INVALID_JSON", message: "Malformed JSON request body." },
        { status: 400 }
      );
    }

    const parsed = upsertStudentTemplateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          code: "VALIDATION_ERROR",
          message: parsed.error.issues[0]?.message ?? "Invalid face template payload.",
        },
        { status: 400 }
      );
    }

    const result = await upsertStudentFaceTemplate(student.id, parsed.data);
    if (!result.ok) {
      return NextResponse.json(
        { ok: false, code: result.code, message: result.message },
        { status: result.status }
      );
    }

    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return NextResponse.json(
        { ok: false, code: err.code, message: err.message },
        { status: err.status }
      );
    }
    return NextResponse.json(
      { ok: false, code: "TEMPLATE_SAVE_ERROR", message: "Unable to save biometric template." },
      { status: 500 }
    );
  }
}
