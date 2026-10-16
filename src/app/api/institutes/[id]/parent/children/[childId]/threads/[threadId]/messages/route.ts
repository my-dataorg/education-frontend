import { auth } from "@/auth";
import { EDUCATION_API_URL } from "@/lib/education-api-url";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; childId: string; threadId: string }> }
) {
  const { id, childId, threadId } = await params;
  const session = await auth();
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const response = await fetch(
    `${EDUCATION_API_URL}/v1/institutes/${id}/parent/children/${childId}/threads/${threadId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        "Content-Type": "application/json",
      },
      body: await request.text(),
      cache: "no-store",
    }
  );
  const data = await response.json().catch(() => ({}));
  return NextResponse.json(data, { status: response.status });
}
