import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";

const API = process.env.EDUCATION_API_URL || "http://localhost:8010";

async function proxy(
  request: NextRequest,
  assignmentId: string,
  path: string[],
  method: string
) {
  const session = await auth();
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const suffix = path.length ? `/${path.join("/")}` : "";
  const url = `${API}/v1/assignment-works/${assignmentId}${suffix}`;
  const init: RequestInit = {
    method,
    headers: { Authorization: `Bearer ${session.accessToken}` },
    cache: "no-store",
  };
  if (method !== "GET" && method !== "HEAD") {
    const body = await request.text();
    init.headers = { ...init.headers, "Content-Type": "application/json" };
    init.body = body;
  }
  const res = await fetch(url, init);
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ assignmentId: string; path?: string[] }> }
) {
  const { assignmentId, path = [] } = await params;
  return proxy(request, assignmentId, path, "GET");
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ assignmentId: string; path?: string[] }> }
) {
  const { assignmentId, path = [] } = await params;
  return proxy(request, assignmentId, path, "PATCH");
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ assignmentId: string; path?: string[] }> }
) {
  const { assignmentId, path = [] } = await params;
  return proxy(request, assignmentId, path, "PUT");
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ assignmentId: string; path?: string[] }> }
) {
  const { assignmentId, path = [] } = await params;
  return proxy(request, assignmentId, path, "POST");
}
