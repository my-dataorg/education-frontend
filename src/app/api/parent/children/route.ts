import { auth } from "@/auth";
import { EDUCATION_API_URL } from "@/lib/education-api-url";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const instituteId = request.nextUrl.searchParams.get("instituteId");
  const url = new URL(`${EDUCATION_API_URL}/v1/users/me/guardian-children`);
  if (instituteId) url.searchParams.set("instituteId", instituteId);
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${session.accessToken}` },
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({}));
  return NextResponse.json(data, { status: response.status });
}
