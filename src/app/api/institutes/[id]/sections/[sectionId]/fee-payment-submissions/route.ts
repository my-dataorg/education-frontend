import { NextRequest } from "next/server";
import { proxyEducationJson } from "@/lib/education-bff";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sectionId: string }> }
) {
  const { id, sectionId } = await params;
  const status = request.nextUrl.searchParams.get("status");
  const qs = status ? `?status=${encodeURIComponent(status)}` : "";
  return proxyEducationJson(
    request,
    `/v1/institutes/${id}/sections/${sectionId}/fee-payment-submissions${qs}`,
    "GET"
  );
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sectionId: string }> }
) {
  const { id, sectionId } = await params;
  return proxyEducationJson(
    request,
    `/v1/institutes/${id}/sections/${sectionId}/fee-payment-submissions`,
    "POST"
  );
}
