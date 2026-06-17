import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function withEmbedHeader(request: NextRequest): Headers {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-edu-embed", "1");
  return requestHeaders;
}

export function middleware(request: NextRequest) {
  const embedParam = request.nextUrl.searchParams.get("embed") === "1";
  const embedCookie = request.cookies.get("edu-embed")?.value === "1";
  const isTopLevel = request.headers.get("sec-fetch-dest") === "document";
  const referer = request.headers.get("referer") || "";
  const fromPlatform = referer.includes("localhost:3000");

  if (embedParam || embedCookie) {
    if (!embedParam && embedCookie) {
      const url = request.nextUrl.clone();
      url.searchParams.set("embed", "1");
      return NextResponse.redirect(url);
    }

    const response = NextResponse.next({ request: { headers: withEmbedHeader(request) } });
    response.cookies.set("edu-embed", "1", { path: "/", sameSite: "lax" });
    return response;
  }

  if (isTopLevel && !fromPlatform) {
    const response = NextResponse.next();
    response.cookies.delete("edu-embed");
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api).*)"],
};
