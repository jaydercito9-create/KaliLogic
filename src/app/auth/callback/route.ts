import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Robust Auth Callback Handler for Next.js App Router + Supabase SSR
 *
 * Supports BOTH flows that Supabase can send:
 *   1. PKCE flow:        ?code=...          → exchangeCodeForSession(code)
 *   2. OTP / Magic Link: ?token_hash=...&type=... → verifyOtp({ token_hash, type })
 *
 * This is the production-safe approach because Supabase can emit either
 * depending on project settings, client version, or email template.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);

  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash") || url.searchParams.get("token");
  const type = (url.searchParams.get("type") || "signup") as any;

  let next = url.searchParams.get("next") ?? "/app";
  const provisionDemo = url.searchParams.get("provision") === "demo";

  // Strict sanitization: never allow redirect to /demo or external URLs
  if (!next || !next.startsWith("/") || next.startsWith("//") || next === "/demo") {
    next = "/app";
  }

  // Create the response object FIRST so we can attach auth cookies to it
  const supabaseResponse = NextResponse.redirect(new URL(next, url.origin));

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  try {
    let authError: any = null;

    if (code) {
      // === PKCE FLOW ===
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      authError = error;
    } else if (tokenHash) {
      // === OTP / MAGIC LINK / EMAIL CONFIRMATION FLOW ===
      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type,
      });
      authError = error;
    } else {
      // No valid auth parameter present
      console.warn("[/auth/callback] No code and no token_hash/token present");
      return NextResponse.redirect(new URL("/login?error=auth_failed", url.origin));
    }

    if (authError) {
      console.error("[/auth/callback] Auth exchange/verify error:", authError);
      return NextResponse.redirect(new URL("/login?error=auth_failed", url.origin));
    }

    // Optional: run demo organization provisioning
    if (provisionDemo) {
      try {
        const { error: provError } = await supabase.rpc("provision_demo_organization");
        if (provError) {
          console.error("[/auth/callback] provision_demo_organization error (non-fatal):", provError.message);
          // We do NOT block login on provisioning errors
        }
      } catch (provErr) {
        console.error("[/auth/callback] provision error:", provErr);
      }
    }

    // Platform admin override → /control
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("is_platform_admin")
          .eq("id", user.id)
          .maybeSingle();

        if (profile?.is_platform_admin) {
          supabaseResponse.headers.set("location", new URL("/control", url.origin).toString());
          return supabaseResponse;
        }
      }
    } catch (adminErr) {
      console.error("[/auth/callback] platform admin check error:", adminErr);
    }

    return supabaseResponse;
  } catch (err) {
    console.error("[/auth/callback] unexpected error:", err);
    return NextResponse.redirect(new URL("/login?error=auth_failed", url.origin));
  }
}
