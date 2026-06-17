import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";

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

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const joinCode = req.nextUrl.searchParams.get("joinCode");
  if (!joinCode) {
    return NextResponse.json({ error: "joinCode required" }, { status: 400 });
  }
  const res = await fetch(
    `${API}/v1/institutes/lookup?joinCode=${encodeURIComponent(joinCode)}`,
    { headers: authHeaders(session), cache: "no-store" }
  );
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
