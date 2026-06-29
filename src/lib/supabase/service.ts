import { createClient } from "@supabase/supabase-js";

export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // Support common names in case of slight mismatch in Vercel
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SERVICE_ROLE_KEY ||
    process.env.VICE_ROLE_KEY || // in case truncated name was used
    "";

  if (!url || !serviceKey) {
    console.error("Faltan las keys de Supabase service role. Verifica el nombre exacto SUPABASE_SERVICE_ROLE_KEY en Vercel.");
    return {
      from: () => ({ insert: async () => ({ error: new Error("No service key") }), select: () => ({ eq: () => ({ limit: () => ({ maybeSingle: async () => ({ data: null }) }) }) }) }),
      auth: { admin: { createUser: async () => ({ data: null, error: new Error("No service key") }), listUsers: async () => ({ data: { users: [] }, error: null }) } },
    } as any;
  }

  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
