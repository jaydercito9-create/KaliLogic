import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY en el servidor.");
    // Safe dummy so Server Components never crash the render
    const dummyResponse = { data: null, error: null };
    const dummyList = { data: [], error: null };
    const chain = () => ({
      eq: chain,
      limit: () => ({ maybeSingle: async () => dummyResponse, order: async () => dummyList }),
      order: () => ({ limit: async () => dummyList }),
      maybeSingle: async () => dummyResponse,
      single: async () => dummyResponse,
    });
    return {
      auth: { getUser: async () => ({ data: { user: null }, error: null }) },
      from: () => ({ select: chain }),
    } as any;
  }

  const cookieStore = await cookies();

  return createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Los Server Components no pueden escribir cookies. Proxy refrescará la sesión.
        }
      },
    },
  });
}
