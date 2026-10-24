import { auth } from "@/auth";
import { NextResponse } from "next/server";

const API = process.env.EDUCATION_API_URL || "http://localhost:8010";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sectionId: string }> }
) {
  const { sectionId } = await params;
  const session = await auth();
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const res = await fetch(`${API}/v1/sections/${sectionId}/assignment-works/assigned`, {
    headers: { Authorization: `Bearer ${session.accessToken}` },
    cache: "no-store",
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
