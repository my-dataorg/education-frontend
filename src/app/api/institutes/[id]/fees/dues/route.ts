import { auth } from "@/auth";
import { EDUCATION_API_URL } from "@/lib/education-api-url";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const studentId = request.nextUrl.searchParams.get("studentId");
  const url = new URL(`${EDUCATION_API_URL}/v1/institutes/${id}/fees/dues`);
  if (studentId) url.searchParams.set("student_id", studentId);
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${session.accessToken}` },
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({}));
  return NextResponse.json(data, { status: response.status });
}
