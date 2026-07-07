// Refreshes the Supabase session cookie on every request that isn't a
// static asset, AND handles CORS for the public API routes the separate
// static frontend calls cross-origin (§5.1, §9 in the design doc's §12.6
// called this out as required — it just hadn't been implemented yet).
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Falls back to "*" for local development convenience. Set
// NEXT_PUBLIC_SITE_URL to the real domain before Phase 4 ships — these
// routes carry no cookies/credentials, so a wildcard is not a session-
// hijack risk, but it's still tighter to lock it down once there's a
// real domain to lock it to.
const ALLOWED_ORIGIN = "*";

// Only the public, unauthenticated routes the static frontend actually
// calls need CORS — admin routes are same-origin (called from the admin
// portal itself) and stay behind requireStaffSession() regardless.
const CORS_PATHS = ["/api/jobs", "/api/apply", "/api/contact", "/api/upload-url"];

function isCorsPath(pathname: string): boolean {
  return CORS_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

function withCorsHeaders(response: NextResponse): NextResponse {
  response.headers.set("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type");
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Preflight: the browser sends this before the real cross-origin POST
  // (since it carries a Content-Type: application/json header) and
  // expects a fast, header-only response — no session logic needed here.
  if (request.method === "OPTIONS" && isCorsPath(pathname)) {
    return withCorsHeaders(new NextResponse(null, { status: 204 }));
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Touching getUser() is what actually triggers the refresh-if-needed
  // logic — just creating the client above does nothing on its own.
  await supabase.auth.getUser();

  if (isCorsPath(pathname)) {
    response = withCorsHeaders(response);
  }

  return response;
}

export const config = {
  matcher: [
    // Run on everything except static files and image optimization —
    // no point refreshing a session to serve a favicon.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp)$).*)",
  ],
};
