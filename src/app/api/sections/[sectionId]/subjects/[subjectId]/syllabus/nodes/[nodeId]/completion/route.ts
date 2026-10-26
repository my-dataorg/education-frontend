import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";

const API = process.env.EDUCATION_API_URL || "http://localhost:8010";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ sectionId: string; subjectId: string; nodeId: string }> }
) {
  const session = await auth();
  if (!session?.accessToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { sectionId, subjectId, nodeId } = await params;
  const res = await fetch(
    `${API}/v1/sections/${sectionId}/subjects/${subjectId}/syllabus/nodes/${nodeId}/completion`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        "Content-Type": "application/json",
      },
      body: await req.text(),
    }
  );
  return NextResponse.json(await res.json(), { status: res.status });
}
