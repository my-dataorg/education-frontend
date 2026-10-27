import { auth } from "@/auth";
import { NextResponse } from "next/server";

const API = process.env.EDUCATION_API_URL || "http://localhost:8010";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.accessToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const res = await fetch(`${API}/v1/institutes/${id}/leave-requests/inbox`, {
    headers: { Authorization: `Bearer ${session.accessToken}` },
    cache: "no-store",
  });
  return NextResponse.json(await res.json(), { status: res.status });
}
