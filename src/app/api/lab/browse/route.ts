import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";

const API = process.env.EDUCATION_API_URL || "http://localhost:8010";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const path = req.nextUrl.searchParams.get("path") ?? "";
  const query = path ? `?path=${encodeURIComponent(path)}` : "";
  const res = await fetch(`${API}/v1/lab/browse${query}`, {
    headers: { Authorization: `Bearer ${session.accessToken}` },
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
