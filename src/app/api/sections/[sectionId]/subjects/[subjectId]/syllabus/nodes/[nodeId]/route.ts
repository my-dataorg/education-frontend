import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";

const API = process.env.EDUCATION_API_URL || "http://localhost:8010";

async function proxy(
  req: NextRequest,
  sectionId: string,
  subjectId: string,
  nodeId: string
) {
  const session = await auth();
  if (!session?.accessToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const res = await fetch(
    `${API}/v1/sections/${sectionId}/subjects/${subjectId}/syllabus/nodes/${nodeId}`,
    {
      method: req.method,
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        "Content-Type": "application/json",
      },
      body: req.method === "DELETE" ? undefined : await req.text(),
    }
  );
  if (res.status === 204) return new NextResponse(null, { status: 204 });
  return NextResponse.json(await res.json(), { status: res.status });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ sectionId: string; subjectId: string; nodeId: string }> }
) {
  const { sectionId, subjectId, nodeId } = await params;
  return proxy(req, sectionId, subjectId, nodeId);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ sectionId: string; subjectId: string; nodeId: string }> }
) {
  const { sectionId, subjectId, nodeId } = await params;
  return proxy(req, sectionId, subjectId, nodeId);
}
