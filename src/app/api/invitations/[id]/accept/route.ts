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

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const res = await fetch(`${API}/v1/invitations/${id}/accept`, {
    method: "POST",
    headers: authHeaders(session),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
