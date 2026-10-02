import { auth } from "@/auth";
import { NextResponse } from "next/server";

const API = process.env.EDUCATION_API_URL || "http://localhost:8010";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; sectionId: string }> }
) {
  const session = await auth();
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id, sectionId } = await params;
  const response = await fetch(`${API}/v1/institutes/${id}/sections/${sectionId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${session.accessToken}` },
  });
  return response.status === 204
    ? new NextResponse(null, { status: 204 })
    : NextResponse.json(await response.json(), { status: response.status });
}
