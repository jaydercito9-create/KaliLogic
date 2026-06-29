import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

import { proxy } from "./src/proxy";

export async function middleware(request: NextRequest) {
  // 1. Domain/host based routing (app. and control.) — safe no-op on vercel.app for now
  const proxyResult = proxy(request);

  // If proxy performed a rewrite (pathname changed), return it immediately
  if (proxyResult && proxyResult.headers.get("x-middleware-rewrite")) {
    return proxyResult;
  }

  // 2. Supabase Auth session handling (required for getUser, cookies, etc.)
  const supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Refresh auth session on every request
  await supabase.auth.getUser();

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static files, images, etc.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
