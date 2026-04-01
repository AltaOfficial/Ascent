import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const protectedRoutes = ["/dashboard"];
const authRoutes = ["/login", "/signup"];

export function proxy(request: NextRequest) {
  const token = request.cookies.get("access_token")?.value;
  const tokenIsValid = token
    ? jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET))
    : false;
  const { pathname } = request.nextUrl;

  if (
    !tokenIsValid &&
    protectedRoutes.some((route) => pathname.startsWith(route))
  ) {
    return NextResponse.redirect(new URL("/login", request.url));
  } else if (
    tokenIsValid &&
    authRoutes.some((route) => pathname.startsWith(route))
  ) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
}

export const config = {
  matcher: ["/dashboard/:path*", "/login", "/signup"],
};
