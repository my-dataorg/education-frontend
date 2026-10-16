import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";

const API = process.env.EDUCATION_API_URL || "http://localhost:8010";

function backendUrl(request: NextRequest, path: string, forwardQuery = true) {
  const url = new URL(path.startsWith("http") ? path : `${API}${path}`);
  if (!forwardQuery) return url;
  const incoming = request.nextUrl.searchParams;
  incoming.forEach((value, key) => {
    url.searchParams.set(key, value);
  });
  const campus = incoming.get("campus_id") || incoming.get("branch");
  if (campus && !url.searchParams.has("campus_id")) {
    url.searchParams.set("campus_id", campus);
  }
  return url;
}

export async function proxyEducationJson(
  request: NextRequest,
  path: string,
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
  options?: { forwardQuery?: boolean; body?: string }
) {
  const session = await auth();
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const forwardQuery = options?.forwardQuery !== false;
  const response = await fetch(backendUrl(request, path, forwardQuery), {
    method,
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
      ...(method !== "GET" && method !== "DELETE" ? { "Content-Type": "application/json" } : {}),
    },
    body:
      method === "GET" || method === "DELETE"
        ? undefined
        : options?.body ?? (await request.text()),
  });

  if (response.status === 204) {
    return new NextResponse(null, { status: 204 });
  }

  const text = await response.text();
  try {
    return NextResponse.json(JSON.parse(text), { status: response.status });
  } catch {
    return new NextResponse(text, {
      status: response.status,
      headers: { "Content-Type": response.headers.get("Content-Type") || "text/plain" },
    });
  }
}
