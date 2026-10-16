import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";

const API = process.env.EDUCATION_API_URL || "http://localhost:8010";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; reportType: string }> }
) {
  const session = await auth();
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id, reportType } = await params;
  const url = new URL(`${API}/v1/institutes/${id}/reports/${reportType}`);
  request.nextUrl.searchParams.forEach((value, key) => {
    url.searchParams.set(key, value);
  });
  const campus = request.nextUrl.searchParams.get("branch");
  if (campus && !url.searchParams.has("campus_id")) {
    url.searchParams.set("campus_id", campus);
  }
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${session.accessToken}` },
  });
  const body = await response.text();
  return new NextResponse(body, {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("Content-Type") || "text/csv",
      "Content-Disposition":
        response.headers.get("Content-Disposition") || `attachment; filename="${reportType}-report.csv"`,
    },
  });
}
