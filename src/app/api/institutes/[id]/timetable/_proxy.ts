import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";

const API = process.env.EDUCATION_API_URL || "http://localhost:8010";

const QUERY_KEYS = ["view", "id", "campus_id", "state", "date"] as const;

export async function proxyTimetable(
  request: NextRequest,
  instituteId: string,
  suffix: string,
  method: "GET" | "POST" | "PATCH",
  options?: { forwardQuery?: boolean; body?: string }
) {
  const session = await auth();
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(`${API}/v1/institutes/${instituteId}/timetable${suffix}`);
  if (options?.forwardQuery !== false) {
    const incoming = new URL(request.url);
    for (const key of QUERY_KEYS) {
      const value = incoming.searchParams.get(key);
      if (value) url.searchParams.set(key, value);
    }
    const campus =
      incoming.searchParams.get("campus_id") || incoming.searchParams.get("branch");
    if (campus && !url.searchParams.has("campus_id")) {
      url.searchParams.set("campus_id", campus);
    }
  }

  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
      ...(method !== "GET" ? { "Content-Type": "application/json" } : {}),
    },
    body: method === "GET" ? undefined : options?.body ?? await request.text(),
  });

  const text = await response.text();
  try {
    return NextResponse.json(JSON.parse(text), { status: response.status });
  } catch {
    return new NextResponse(text, { status: response.status });
  }
}
