import { NextRequest } from "next/server";
import { proxyEducationJson } from "@/lib/education-bff";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ examId: string }> }
) {
  const { examId } = await params;
  return proxyEducationJson(request, `/v1/exams/${examId}/publish`, "POST", { forwardQuery: false });
}
