import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";

const API = process.env.EDUCATION_API_URL || "http://localhost:8010";

const FORWARD = ["tab", "q", "role", "status", "class", "section", "campus_id", "branch"] as const;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(`${API}/v1/institutes/${id}/members/export`);
  const incoming = req.nextUrl.searchParams;
  for (const key of FORWARD) {
    const value = incoming.get(key);
    if (!value) continue;
    if (key === "branch") url.searchParams.set("campus_id", value);
    else url.searchParams.set(key, value);
  }

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${session.accessToken}` },
  });
  const text = await res.text();
  if (!res.ok) {
    try {
      return NextResponse.json(JSON.parse(text), { status: res.status });
    } catch {
      return NextResponse.json({ detail: text }, { status: res.status });
    }
  }
  return new NextResponse(text, {
    status: res.status,
    headers: {
      "Content-Type": res.headers.get("Content-Type") || "text/csv",
      "Content-Disposition": res.headers.get("Content-Disposition") || 'attachment; filename="members.csv"',
    },
  });
}
