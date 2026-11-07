import { NextRequest } from "next/server";
import { proxyEducationJson } from "@/lib/education-bff";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sectionId: string }> }
) {
  const { id, sectionId } = await params;
  return proxyEducationJson(request, `/v1/institutes/${id}/sections/${sectionId}/fee-default`, "GET");
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sectionId: string }> }
) {
  const { id, sectionId } = await params;
  return proxyEducationJson(request, `/v1/institutes/${id}/sections/${sectionId}/fee-default`, "PUT");
}
