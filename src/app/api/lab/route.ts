import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";

const API = process.env.EDUCATION_API_URL || "http://localhost:8010";

async function forward(path: string, init: RequestInit) {
  const session = await auth();
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
      ...(init.headers ?? {}),
    },
  });
  if (res.status === 204) return new NextResponse(null, { status: 204 });
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}

export async function GET() {
  return forward("/v1/lab", { method: "GET" });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  return forward("/v1/lab/run", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: body.name, source: body.source }),
  });
}
