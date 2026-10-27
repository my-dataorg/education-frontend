import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";

const API = process.env.EDUCATION_API_URL || "http://localhost:8010";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.accessToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const query = request.nextUrl.search;
  const res = await fetch(`${API}/v1/institutes/${id}/leave-requests${query}`, {
    headers: { Authorization: `Bearer ${session.accessToken}` },
    cache: "no-store",
  });
  return NextResponse.json(await res.json(), { status: res.status });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.accessToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const res = await fetch(`${API}/v1/institutes/${id}/leave-requests`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
      "Content-Type": "application/json",
    },
    body: await request.text(),
  });
  return NextResponse.json(await res.json(), { status: res.status });
}
