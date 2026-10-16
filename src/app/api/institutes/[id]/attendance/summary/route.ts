import { NextRequest } from "next/server";
import { proxyEducationJson } from "@/lib/education-bff";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const query = new URLSearchParams(request.nextUrl.searchParams);
  const day = query.get("day") || query.get("date");
  if (day) query.set("day", day);
  query.delete("date");
  const qs = query.toString();
  return proxyEducationJson(request, `/v1/institutes/${id}/attendance/summary${qs ? `?${qs}` : ""}`, "GET", {
    forwardQuery: false,
  });
}
