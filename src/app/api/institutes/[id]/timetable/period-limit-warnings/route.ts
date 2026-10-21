import { NextRequest } from "next/server";
import { proxyTimetable } from "../_proxy";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return proxyTimetable(request, id, "/period-limit-warnings", "GET");
}
