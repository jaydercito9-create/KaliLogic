import { NextRequest, NextResponse } from "next/server";

function normalizeHost(request: NextRequest) {
  return (request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "")
    .split(":")[0]
    .toLowerCase();
}

/**
 * Proxy para subdominios (app. y control.).
 * Actualmente solo activa rewrites cuando usas dominios custom o *.localhost para pruebas.
 * Mientras no tengas kalilogic.pe, usa las rutas normales:
 *   - /app     → panel del cliente
 *   - /control → superadministración
 */
export function proxy(request: NextRequest) {
  const host = normalizeHost(request);
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN?.toLowerCase() ?? "kalilogic.pe";
  const { pathname } = request.nextUrl;

  const isAppHost =
    host === `app.${rootDomain}` ||
    host === "app.localhost" ||
    host.endsWith(".app.localhost");

  const isControlHost =
    host === `control.${rootDomain}` ||
    host === "control.localhost" ||
    host.endsWith(".control.localhost");

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

  return NextResponse.next();
}
