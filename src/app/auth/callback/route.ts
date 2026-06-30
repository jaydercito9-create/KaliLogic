import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);

  const code = url.searchParams.get("code");
  const token = url.searchParams.get("token");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") || "signup";
  const requestedNext = url.searchParams.get("next") ?? "/app";
  const provisionDemo = url.searchParams.get("provision") === "demo";

  const next = /^\/billing\/(basic|premium|plus)$/.test(requestedNext) ? requestedNext : "/app";
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
    // === Intercambio de sesión: soporta los dos flujos principales de Supabase ===
    if (code) {
      // PKCE (el que usa signInWithOtp + emailRedirectTo la mayoría de las veces)
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) throw error;
    } else if (tokenHash || token) {
      // Token hash / OTP / confirmación de email tradicional
      const { error } = await supabase.auth.verifyOtp({
        token_hash: (tokenHash || token)!,
        type: type as any,
      });
      if (error) throw error;
    } else {
      // Sin parámetros → verificamos si ya hay sesión
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Missing code or token_hash in callback");
      }
    }

    // Provisioning del demo (solo cuando viene del formulario /demo)
    if (provisionDemo) {
      const { error: provisionError } = await supabase.rpc("provision_demo_organization");
      if (provisionError) throw provisionError;
    }

    // Redirección de administradores de plataforma
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
    console.error("[/auth/callback] fatal error during exchange/provision:", err);
    // Siempre devolvemos un redirect, nunca dejamos que Next lance 500 o 404 extraño
    return NextResponse.redirect(new URL("/login?error=auth_failed", url.origin));
  }
}
