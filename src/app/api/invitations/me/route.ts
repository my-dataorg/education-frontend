import { auth } from "@/auth";
import { NextResponse } from "next/server";

const API = process.env.EDUCATION_API_URL || "http://localhost:8010";

export async function GET() {
  const session = await auth();
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const headers: Record<string, string> = {
    Authorization: `Bearer ${session.accessToken}`,
  };
  if (session.user?.email) {
    headers["X-User-Email"] = session.user.email;
  }
  const res = await fetch(`${API}/v1/users/me/invitations`, { headers, cache: "no-store" });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
