import { NextRequest } from "next/server";
import { proxyEducationJson } from "@/lib/education-bff";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; planId: string }> }
) {
  const { id, planId } = await params;
  return proxyEducationJson(request, `/v1/institutes/${id}/fee-plans/${planId}`, "PATCH");
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; planId: string }> }
) {
  const { id, planId } = await params;
  return proxyEducationJson(request, `/v1/institutes/${id}/fee-plans/${planId}`, "DELETE");
}
