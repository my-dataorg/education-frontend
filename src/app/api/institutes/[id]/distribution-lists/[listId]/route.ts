import { auth } from "@/auth";
import { NextResponse } from "next/server";

const API = process.env.EDUCATION_API_URL || "http://localhost:8010";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; listId: string }> }
) {
  const session = await auth();
  if (!session?.accessToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, listId } = await params;
  const response = await fetch(`${API}/v1/institutes/${id}/distribution-lists/${listId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${session.accessToken}` },
  });
  if (response.status === 204) return new NextResponse(null, { status: 204 });
  const data = await response.json().catch(() => ({}));
  return NextResponse.json(data, { status: response.status });
}
