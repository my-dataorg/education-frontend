import { auth } from "@/auth";
import { NextResponse } from "next/server";

const API = process.env.EDUCATION_API_URL || "http://localhost:8010";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const url = new URL(`${API}/v1/institutes/${id}/overview`);
  for (const key of ["campus_id", "day"]) {
    const value = new URL(request.url).searchParams.get(key);
    if (value) url.searchParams.set(key, value);
  }
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${session.accessToken}` },
    next: { revalidate: 60 },
  });
  return NextResponse.json(await response.json(), { status: response.status });
}
