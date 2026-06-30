"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function EntitlementRefresh({ orgId }: { orgId: string }) {
  const router = useRouter();
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(`entitlement:${orgId}`).on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "organizations", filter: `id=eq.${orgId}` },
      () => router.refresh(),
    ).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [orgId, router]);
  return null;
}
