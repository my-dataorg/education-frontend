import { NextRequest } from "next/server";
import { proxyEducationJson } from "@/lib/education-bff";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; examId: string }> }
) {
  const { id, examId } = await params;
  return proxyEducationJson(request, `/v1/institutes/${id}/exams/${examId}`, "GET");
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; examId: string }> }
) {
  const { id, examId } = await params;
  return proxyEducationJson(request, `/v1/institutes/${id}/exams/${examId}`, "PUT");
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; examId: string }> }
) {
  const { id, examId } = await params;
  return proxyEducationJson(request, `/v1/institutes/${id}/exams/${examId}`, "DELETE");
}
