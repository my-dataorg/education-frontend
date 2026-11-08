import { NextRequest } from "next/server";
import { proxyEducationJson } from "@/lib/education-bff";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sectionId: string; studentId: string }> }
) {
  const { id, sectionId, studentId } = await params;
  return proxyEducationJson(
    request,
    `/v1/institutes/${id}/sections/${sectionId}/students/${studentId}/fees`,
    "GET"
  );
}
