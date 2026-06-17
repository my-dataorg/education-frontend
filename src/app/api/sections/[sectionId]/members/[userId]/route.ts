import { auth } from "@/auth";
import { NextResponse } from "next/server";

const API = process.env.EDUCATION_API_URL || "http://localhost:8010";

function authHeaders(session: { accessToken?: string; user?: { email?: string | null } }) {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${session.accessToken!}`,
  };
  if (session.user?.email) {
    headers["X-User-Email"] = session.user.email;
  }
  return headers;
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ sectionId: string; userId: string }> }
) {
  const { sectionId, userId } = await params;
  const session = await auth();
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const res = await fetch(`${API}/v1/sections/${sectionId}/members/${userId}`, {
    method: "DELETE",
    headers: authHeaders(session),
  });
  if (res.status === 204) {
    return new NextResponse(null, { status: 204 });
  }
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
