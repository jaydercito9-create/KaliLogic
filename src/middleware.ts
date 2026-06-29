import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

function normalizeHost(request: NextRequest) {
  return (request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "")
    .split(":")[0]
    .toLowerCase();
}

function applyProxy(request: NextRequest) {
  const host = normalizeHost(request);
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN?.toLowerCase() ?? "kalilogic.pe";
  const { pathname } = request.nextUrl;

  const isAppHost = host === `app.${rootDomain}` || host === "app.localhost" || host.endsWith(".app.localhost");
  const isControlHost = host === `control.${rootDomain}` || host === "control.localhost" || host.endsWith(".control.localhost");

  if (isAppHost && !pathname.startsWith("/app")) {
    const url = request.nextUrl.clone();
    url.pathname = `/app${pathname === "/" ? "" : pathname}`;
    const res = NextResponse.rewrite(url);
    res.headers.set("x-middleware-rewrite", "1");
    return res;
  }

  if (isControlHost && !pathname.startsWith("/control")) {
    const url = request.nextUrl.clone();
    url.pathname = `/control${pathname === "/" ? "" : pathname}`;
    const res = NextResponse.rewrite(url);
    res.headers.set("x-middleware-rewrite", "1");
    return res;
  }

  return null;
}

export async function middleware(request: NextRequest) {
  // Domain based routing for app. and control.
  try {
    const proxyResult = applyProxy(request);
    if (proxyResult) {
      return proxyResult;
    }
  } catch {}

  // Supabase session
  const supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "",
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

  try {
    await supabase.auth.getUser();
  } catch {}

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
