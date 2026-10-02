import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";

const API = process.env.EDUCATION_API_URL || "http://localhost:8010";

async function proxy(
  req: NextRequest,
  id: string,
  method: "GET" | "PUT"
) {
  const session = await auth();
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const response = await fetch(`${API}/v1/institutes/${id}/schedule`, {
    method,
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
      "Content-Type": "application/json",
    },
    body: method === "PUT" ? await req.text() : undefined,
  });
  return NextResponse.json(await response.json(), { status: response.status });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return proxy(req, (await params).id, "GET");
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return proxy(req, (await params).id, "PUT");
}
