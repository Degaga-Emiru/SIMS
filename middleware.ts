import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import { canAccessRoute } from "@/lib/permissions";
import type { Role } from "@/app/generated/prisma";

const authPages = ["/login", "/register", "/forgot-password", "/reset-password"];

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const isAuthenticated = !!token;
    const { pathname } = req.nextUrl;

    if (authPages.some((page) => pathname.startsWith(page)) && isAuthenticated) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    if (pathname.startsWith("/dashboard") && token?.role) {
      if (!canAccessRoute(token.role as Role, pathname)) {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    }

    const response = NextResponse.next();
    response.headers.set("X-Frame-Options", "DENY");
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    return response;
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        if (req.nextUrl.pathname.startsWith("/dashboard")) {
          return !!token;
        }
        return true;
      },
    },
  }
);

export const config = {
  matcher: ["/dashboard/:path*", "/login", "/register", "/forgot-password", "/reset-password"],
};
