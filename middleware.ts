import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "./lib/auth";

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (path.startsWith("/_next") || path === "/favicon.ico" || path.startsWith("/login") || path.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  const token = request.cookies.get("constructflow_session")?.value;
  const session = token ? verifySession(token) : null;
  if (session) return NextResponse.next();

  if (path.startsWith("/api/")) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const login = new URL("/login", request.url);
  login.searchParams.set("next", path);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
