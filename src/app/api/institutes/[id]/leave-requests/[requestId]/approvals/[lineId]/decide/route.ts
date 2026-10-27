import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";

const API = process.env.EDUCATION_API_URL || "http://localhost:8010";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; requestId: string; lineId: string }> }
) {
  const session = await auth();
  if (!session?.accessToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, requestId, lineId } = await params;
  const res = await fetch(
    `${API}/v1/institutes/${id}/leave-requests/${requestId}/approvals/${lineId}/decide`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        "Content-Type": "application/json",
      },
      body: await request.text(),
    }
  );
  return NextResponse.json(await res.json(), { status: res.status });
}
