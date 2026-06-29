"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { completeSale, type SaleInput } from "@/app/actions/sale-core";

export async function processSale(data: SaleInput) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false as const, error: "Sesión expirada" };

    return completeSale(data, user.id, createServiceClient());
  } catch (error: unknown) {
    console.error("processSale error:", error);
    return { success: false as const, error: "Error interno al procesar la venta." };
  }
}
