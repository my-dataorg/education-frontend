import { auth } from "@/auth";
import { NextResponse } from "next/server";

const API = process.env.EDUCATION_API_URL || "http://localhost:8010";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ sectionId: string; subjectId: string; studentId: string }> }
) {
  const session = await auth();
  if (!session?.accessToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { sectionId, subjectId, studentId } = await params;
  const res = await fetch(`${API}/v1/sections/${sectionId}/subjects/${subjectId}/students/${studentId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${session.accessToken}` },
  });
  if (res.status === 204) return new NextResponse(null, { status: 204 });
  return NextResponse.json(await res.json(), { status: res.status });
}
