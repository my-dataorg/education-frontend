import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";

const API = process.env.EDUCATION_API_URL || "http://localhost:8010";

async function proxy(req: NextRequest, id: string) {
  const session = await auth();
  if (!session?.accessToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const res = await fetch(`${API}/v1/institutes/${id}/activities`, {
    method: req.method,
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
      "Content-Type": "application/json",
    },
    body: req.method === "GET" ? undefined : await req.text(),
  });
  if (res.status === 204) return new NextResponse(null, { status: 204 });
  return NextResponse.json(await res.json(), { status: res.status });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return proxy(req, (await params).id);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return proxy(req, (await params).id);
}
