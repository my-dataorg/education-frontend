import { NextRequest } from "next/server";
import { proxyEducationJson } from "@/lib/education-bff";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyEducationJson(request, `/v1/institutes/${id}/nav-access/matrix`, "GET", {
    forwardQuery: false,
  });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyEducationJson(request, `/v1/institutes/${id}/nav-access/matrix`, "PUT", {
    forwardQuery: false,
  });
}
