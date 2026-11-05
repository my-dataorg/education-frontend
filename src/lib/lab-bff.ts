import { NextResponse } from "next/server";
import { educationAccessToken, SESSION_UNAUTHORIZED } from "@/lib/education-session";

const API = process.env.EDUCATION_API_URL || "http://localhost:8010";

export async function labJson(path: string, init: RequestInit = {}) {
  const accessToken = await educationAccessToken();
  if (!accessToken) {
    return NextResponse.json({ error: SESSION_UNAUTHORIZED }, { status: 401 });
  }

  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });

  if (res.status === 204) return new NextResponse(null, { status: 204 });
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
