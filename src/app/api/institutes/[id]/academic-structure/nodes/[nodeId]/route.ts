import { NextRequest } from "next/server";
import { proxyEducationJson } from "@/lib/education-bff";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; nodeId: string }> }
) {
  const { id, nodeId } = await params;
  return proxyEducationJson(request, `/v1/institutes/${id}/academic-structure/nodes/${nodeId}`, "DELETE");
}
