import { NextRequest } from "next/server";
import { proxyEducationJson } from "@/lib/education-bff";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; nodeId: string }> }
) {
  const { id, nodeId } = await params;
  return proxyEducationJson(request, `/v1/institutes/${id}/org-nodes/${nodeId}/fee-items`, "GET");
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; nodeId: string }> }
) {
  const { id, nodeId } = await params;
  return proxyEducationJson(request, `/v1/institutes/${id}/org-nodes/${nodeId}/fee-items`, "PUT");
}
