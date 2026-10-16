import { NextRequest } from "next/server";
import { proxyEducationJson } from "@/lib/education-bff";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; specialDayId: string }> }
) {
  const { id, specialDayId } = await params;
  return proxyEducationJson(
    request,
    `/v1/institutes/${id}/special-days/${specialDayId}`,
    "DELETE",
    { forwardQuery: false }
  );
}
