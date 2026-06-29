import type { SupabaseClient } from "@supabase/supabase-js";

export type CartItem = {
  product_id: string;
  name: string;
  unit_price: number;
  quantity: number;
};

export type SaleInput = {
  org_id: string;
  items: CartItem[];
  customer_name: string;
  payment_method: string;
  discount: number;
};

export async function completeSale(
  data: SaleInput,
  userId: string,
  service: Pick<SupabaseClient, "from" | "rpc">
) {
  const subtotal = data.items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
  const total = Math.max(0, subtotal - data.discount);
  const { data: created, error } = await service
    .from("sales")
    .insert({
      organization_id: data.org_id,
      customer_name: data.customer_name || null,
      subtotal: Number(subtotal.toFixed(2)),
      discount: Number(data.discount.toFixed(2)),
      total: Number(total.toFixed(2)),
      payment_method: data.payment_method,
      status: "completed",
      created_by: userId,
    })
    .select()
    .single();

  const sale = created as { id: string; sale_number: number } | null;
  if (error || !sale) throw error ?? new Error("Sale was not created");

  const { error: itemsError } = await service.from("sale_items").insert(data.items.map((item) => ({
    organization_id: data.org_id,
    sale_id: sale.id,
    product_id: item.product_id,
    quantity: item.quantity,
    unit_price: Number(item.unit_price.toFixed(2)),
    total: Number((item.unit_price * item.quantity).toFixed(2)),
  })));
  if (itemsError) throw itemsError;

  for (const item of data.items) {
    const { error: stockError } = await service.rpc("decrement_stock", {
      p_org_id: data.org_id,
      p_product_id: item.product_id,
      p_qty: item.quantity,
    });
    if (stockError) throw stockError;
  }

  return { success: true as const, saleId: sale.id, saleNumber: sale.sale_number, total };
}
