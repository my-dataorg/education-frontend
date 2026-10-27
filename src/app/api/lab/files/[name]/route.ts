import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";

const API = process.env.EDUCATION_API_URL || "http://localhost:8010";

async function forward(name: string, init: RequestInit) {
  const session = await auth();
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const res = await fetch(`${API}/v1/lab/files/${encodeURIComponent(name)}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
      ...(init.headers ?? {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params;
  return forward(name, { method: "GET" });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params;
  const body = await req.json();
  return forward(name, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ source: body.source ?? "" }),
  });
}
