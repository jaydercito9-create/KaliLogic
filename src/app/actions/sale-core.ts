export const PAYMENT_METHODS = ["efectivo", "tarjeta", "yape", "transferencia"] as const;

export type SaleInput = {
  items: Array<{ product_id: string; quantity: number }>;
  customer_name: string;
  payment_method: (typeof PAYMENT_METHODS)[number];
};

export function parseSaleInput(value: unknown): SaleInput | null {
  if (!value || typeof value !== "object") return null;
  const input = value as Record<string, unknown>;
  if (!Array.isArray(input.items) || input.items.length === 0 || input.items.length > 100) return null;
  if (typeof input.payment_method !== "string" || !PAYMENT_METHODS.includes(input.payment_method as SaleInput["payment_method"])) return null;
  if (typeof input.customer_name !== "string" || input.customer_name.length > 120) return null;

  const items = input.items.map((item) => {
    if (!item || typeof item !== "object") return null;
    const row = item as Record<string, unknown>;
    if (typeof row.product_id !== "string" || !row.product_id || typeof row.quantity !== "number" || !Number.isFinite(row.quantity) || row.quantity <= 0) return null;
    return { product_id: row.product_id, quantity: row.quantity };
  });

  return items.every((item) => item !== null)
    ? { items: items as SaleInput["items"], customer_name: input.customer_name.trim(), payment_method: input.payment_method as SaleInput["payment_method"] }
    : null;
}
