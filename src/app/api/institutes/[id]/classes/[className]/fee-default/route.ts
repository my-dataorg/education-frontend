import { NextRequest } from "next/server";
import { proxyEducationJson } from "@/lib/education-bff";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; className: string }> }
) {
  const { id, className } = await params;
  const encoded = encodeURIComponent(className);
  return proxyEducationJson(request, `/v1/institutes/${id}/classes/${encoded}/fee-default`, "PUT");
}
