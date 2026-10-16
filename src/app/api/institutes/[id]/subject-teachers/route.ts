import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";

const API = process.env.EDUCATION_API_URL || "http://localhost:8010";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(`${API}/v1/institutes/${id}/subject-teachers`);
  const incoming = req.nextUrl.searchParams;
  const show = incoming.get("show") || "class";
  url.searchParams.set("show", show);
  const campus = incoming.get("campus_id") || incoming.get("branch");
  if (campus) url.searchParams.set("campus_id", campus);

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${session.accessToken}` },
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
