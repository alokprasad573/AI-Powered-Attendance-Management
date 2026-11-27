import { NextResponse } from "next/server";
import { logoutCurrentSession } from "@/services/auth.service";

export async function POST() {
  await logoutCurrentSession();
  const response = NextResponse.json(
    { ok: true, message: "Signed out successfully." },
    { status: 200 }
  );
  response.headers.set("Clear-Site-Data", '"cookies", "storage"');
  return response;
}
