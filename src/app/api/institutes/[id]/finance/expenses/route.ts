import { NextRequest } from "next/server";
import { proxyEducationJson } from "@/lib/education-bff";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const category = request.nextUrl.searchParams.get("category");
  const path = category
    ? `/v1/institutes/${id}/finance/expenses?category=${encodeURIComponent(category)}`
    : `/v1/institutes/${id}/finance/expenses`;
  return proxyEducationJson(request, path, "GET", { forwardQuery: !category });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyEducationJson(request, `/v1/institutes/${id}/finance/expenses`, "POST");
}
