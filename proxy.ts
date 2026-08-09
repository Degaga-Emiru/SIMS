import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

const authPages = ["/login", "/register", "/forgot-password", "/reset-password"];

export default withAuth(
  function proxy(req) {
    const token = req.nextauth.token;
    const isAuthenticated = !!token;
    const { pathname } = req.nextUrl;

    // Redirect authenticated users away from auth pages
    if (authPages.some((page) => pathname.startsWith(page)) && isAuthenticated) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    // Add security headers
    const response = NextResponse.next();
    response.headers.set("X-Frame-Options", "DENY");
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    return response;
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;
        
        // Allow access to auth pages without token
        if (authPages.some((page) => pathname.startsWith(page))) {
          return true;
        }
        
        // Require token for dashboard
        if (pathname.startsWith("/dashboard")) {
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