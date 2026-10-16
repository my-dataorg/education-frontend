import { NextRequest } from "next/server";
import { proxyTimetable } from "../_proxy";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return proxyTimetable(request, id, "/publish", "POST", { forwardQuery: false });
}
