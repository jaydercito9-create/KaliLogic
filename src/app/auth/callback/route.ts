import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const requestedNext = searchParams.get("next") ?? "/app";
  const next = requestedNext.startsWith("/") && !requestedNext.startsWith("//") ? requestedNext : "/app";
  const provisionDemo = searchParams.get("provision") === "demo";

  if (code) {
    const supabaseResponse = NextResponse.redirect(`${origin}${next}`);

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

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      if (provisionDemo) {
        const { error: provisionError } = await supabase.rpc("provision_demo_organization");
        if (provisionError) {
          console.error("Demo provisioning error:", provisionError);
          supabaseResponse.headers.set("location", `${origin}/login?error=demo_provision_failed`);
          return supabaseResponse;
        }
      }

      // Redirect to /control if platform admin
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("is_platform_admin")
            .eq("id", user.id)
            .single();
          if (profile?.is_platform_admin) {
            supabaseResponse.headers.set("location", `${origin}/control`);
            return supabaseResponse;
          }
        }
      } catch {}

      return supabaseResponse;
    }
  }

  // Auth code exchange failed — redirect to login with error hint
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
