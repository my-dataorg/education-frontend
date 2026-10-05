import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";

const API = process.env.EDUCATION_API_URL || "http://localhost:8010";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.accessToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const date = request.nextUrl.searchParams.get("absence_date") || "";
  const res = await fetch(`${API}/v1/institutes/${(await params).id}/teacher-absences?absence_date=${date}`, {
    headers: { Authorization: `Bearer ${session.accessToken}` },
  });
  return NextResponse.json(await res.json(), { status: res.status });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.accessToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const res = await fetch(`${API}/v1/institutes/${(await params).id}/teacher-absences`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
      "Content-Type": "application/json",
    },
    body: await request.text(),
  });
  return NextResponse.json(await res.json(), { status: res.status });
}
