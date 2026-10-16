import { NextRequest } from "next/server";
import { proxyEducationJson } from "@/lib/education-bff";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ examId: string }> }
) {
  const { examId } = await params;
  return proxyEducationJson(request, `/v1/exams/${examId}/marks`, "GET", { forwardQuery: false });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ examId: string }> }
) {
  const { examId } = await params;
  return proxyEducationJson(request, `/v1/exams/${examId}/marks`, "PUT", { forwardQuery: false });
}
