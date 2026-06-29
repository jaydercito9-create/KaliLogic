import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
    // Return dummy for browser too to avoid crashes
    return {
      auth: {
        signInWithPassword: async () => ({ error: new Error("No Supabase config") }),
        signUp: async () => ({ error: new Error("No Supabase config") }),
      },
    } as any;
  }

  return createBrowserClient(url, publishableKey);
}
