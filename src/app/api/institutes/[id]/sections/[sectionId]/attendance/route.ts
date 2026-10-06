import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";

const API = process.env.EDUCATION_API_URL || "http://localhost:8010";

async function forward(
  request: NextRequest,
  sectionId: string,
  method: "GET" | "PUT"
) {
  const session = await auth();
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(`${API}/v1/sections/${sectionId}/attendance`);
  const attendanceDate = request.nextUrl.searchParams.get("attendanceDate");
  if (attendanceDate) url.searchParams.set("attendance_date", attendanceDate);

  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
      ...(method === "PUT" ? { "Content-Type": "application/json" } : {}),
    },
    body: method === "PUT" ? await request.text() : undefined,
    cache: "no-store",
  });
  const data = await response.json().catch(() => null);
  return data === null
    ? new NextResponse(null, { status: response.status })
    : NextResponse.json(data, { status: response.status });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sectionId: string }> }
) {
  return forward(request, (await params).sectionId, "GET");
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ sectionId: string }> }
) {
  return forward(request, (await params).sectionId, "PUT");
}
