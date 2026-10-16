import { NextRequest } from "next/server";
import { proxyEducationJson } from "@/lib/education-bff";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyEducationJson(request, `/v1/institutes/${id}/role-settings`, "GET", { forwardQuery: false });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyEducationJson(request, `/v1/institutes/${id}/role-settings`, "PUT", { forwardQuery: false });
}
