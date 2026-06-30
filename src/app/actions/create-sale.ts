"use server";

import { createClient } from "@/lib/supabase/server";
import { parseSaleInput } from "@/app/actions/sale-core";

export async function processSale(value: unknown) {
  const input = parseSaleInput(value);
  if (!input) return { success: false as const, error: "Datos de venta inválidos." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false as const, error: "Sesión expirada." };

  const { data, error } = await supabase
    .rpc("register_sale", {
      p_items: input.items,
      p_customer_name: input.customer_name || null,
      p_payment_method: input.payment_method,
    })
    .single();

  const sale = data as { sale_id: string; sale_number: number | string; total: number | string } | null;
  if (error || !sale) {
    console.error("processSale error:", error);
    return { success: false as const, error: "No se pudo registrar la venta. Revisa el stock y el estado de tu plan." };
  }

  return {
    success: true as const,
    saleId: sale.sale_id,
    saleNumber: Number(sale.sale_number),
    total: Number(sale.total),
  };
}
