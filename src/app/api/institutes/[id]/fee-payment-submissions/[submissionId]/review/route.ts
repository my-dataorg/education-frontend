import { NextRequest } from "next/server";
import { proxyEducationJson } from "@/lib/education-bff";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; submissionId: string }> }
) {
  const { id, submissionId } = await params;
  return proxyEducationJson(
    request,
    `/v1/institutes/${id}/fee-payment-submissions/${submissionId}/review`,
    "POST"
  );
}
