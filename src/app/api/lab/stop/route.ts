import { auth } from "@/auth";
import { NextResponse } from "next/server";

const API = process.env.EDUCATION_API_URL || "http://localhost:8010";

export async function POST() {
  const session = await auth();
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const res = await fetch(`${API}/v1/lab/stop`, {
    method: "POST",
    headers: { Authorization: `Bearer ${session.accessToken}` },
  });
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
