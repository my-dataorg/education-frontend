import { NextRequest } from "next/server";
import { proxyEducationJson } from "@/lib/education-bff";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; receiptId: string }> }
) {
  const { id, receiptId } = await params;
  return proxyEducationJson(request, `/v1/institutes/${id}/fee-receipts/${receiptId}`, "GET");
}
