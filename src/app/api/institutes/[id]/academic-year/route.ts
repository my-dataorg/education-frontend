import { auth } from "@/auth";
import { NextResponse } from "next/server";

const API = process.env.EDUCATION_API_URL || "http://localhost:8010";

async function request(
  req: Request,
  id: string,
  method: "GET" | "PUT"
) {
  const session = await auth();
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const response = await fetch(`${API}/v1/institutes/${id}/academic-year`, {
    method,
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
      ...(method === "PUT" ? { "Content-Type": "application/json" } : {}),
    },
    ...(method === "PUT" ? { body: await req.text() } : {}),
  });
  return NextResponse.json(await response.json(), { status: response.status });
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return request(req, (await params).id, "GET");
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return request(req, (await params).id, "PUT");
}
