import { auth } from "@/auth";
import { NextResponse } from "next/server";

const API = process.env.EDUCATION_API_URL || "http://localhost:8010";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ sectionId: string; subjectId: string }> }
) {
  const session = await auth();
  if (!session?.accessToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { sectionId, subjectId } = await params;
  const res = await fetch(`${API}/v1/sections/${sectionId}/subjects/${subjectId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${session.accessToken}` },
  });
  return res.status === 204
    ? new NextResponse(null, { status: 204 })
    : NextResponse.json(await res.json(), { status: res.status });
}
