import { auth } from "@/auth";
import { NextResponse } from "next/server";

const API = process.env.EDUCATION_API_URL || "http://localhost:8010";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sectionId: string; studentId: string }> }
) {
  const { sectionId, studentId } = await params;
  const session = await auth();
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const response = await fetch(
    `${API}/v1/sections/${sectionId}/students/${studentId}/performance`,
    { headers: { Authorization: `Bearer ${session.accessToken}` }, cache: "no-store" }
  );
  return NextResponse.json(await response.json(), { status: response.status });
}
