import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { addEmbedParam, isEmbedValue } from "@/lib/embed";

function withEmbedHeader(request: NextRequest): Headers {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-edu-embed", "1");
  return requestHeaders;
}

export function middleware(request: NextRequest) {
  const embedParam = isEmbedValue(request.nextUrl.searchParams.get("embed"));
  const embedCookie = request.cookies.get("edu-embed")?.value === "1";
  const isTopLevel = request.headers.get("sec-fetch-dest") === "document";

  if (embedParam || embedCookie) {
    if (embedParam) {
      const response = NextResponse.next({ request: { headers: withEmbedHeader(request) } });
      response.cookies.set("edu-embed", "1", { path: "/", sameSite: "lax" });
      return response;
    }

    if (!isTopLevel) {
      const path = addEmbedParam(request.nextUrl.pathname + request.nextUrl.search);
      return NextResponse.redirect(new URL(path, request.url));
    }
  }

  if (isTopLevel) {
    const response = NextResponse.next();
    response.cookies.delete("edu-embed");
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api).*)"],
};
