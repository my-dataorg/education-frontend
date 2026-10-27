import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";

const API = process.env.EDUCATION_API_URL || "http://localhost:8010";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sectionId: string }> }
) {
  const { sectionId } = await params;
  const session = await auth();
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(`${API}/v1/sections/${sectionId}/attendance/sheet`);
  const days = request.nextUrl.searchParams.get("days");
  const endDate = request.nextUrl.searchParams.get("endDate");
  const summaryPeriod = request.nextUrl.searchParams.get("summaryPeriod");
  const subjectId = request.nextUrl.searchParams.get("subjectId");
  if (days) url.searchParams.set("days", days);
  if (endDate) url.searchParams.set("endDate", endDate);
  if (summaryPeriod) url.searchParams.set("summaryPeriod", summaryPeriod);
  if (subjectId !== null) url.searchParams.set("subjectId", subjectId);

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${session.accessToken}` },
    cache: "no-store",
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
