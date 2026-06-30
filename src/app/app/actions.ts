"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const text = (data: FormData, key: string, max = 200) => String(data.get(key) ?? "").trim().slice(0, max);

export async function moduleAction(data: FormData) {
  const operation = text(data, "operation", 40);
  const organizationId = text(data, "organization_id", 36);
  const id = text(data, "id", 36) || null;
  const back = text(data, "back", 30) || "dashboard";
  if (!UUID.test(organizationId) || (id && !UUID.test(id))) redirect(`/app?modulo=${back}&error=Solicitud+invalida`);

  const supabase = await createClient();
  let error: { message: string } | null = null;

  if (operation === "save_product") {
    ({ error } = await supabase.rpc("save_product", {
      p_organization_id: organizationId, p_id: id, p_name: text(data, "name", 120), p_sku: text(data, "sku", 80),
      p_category: text(data, "category", 80) || null, p_brand: text(data, "brand", 80) || null,
      p_sale_price: Number(text(data, "sale_price", 20)), p_cost_price: Number(text(data, "cost_price", 20)),
      p_initial_stock: Number(text(data, "initial_stock", 20) || 0),
    }));
  } else if (operation === "archive_product") {
    ({ error } = await supabase.rpc("archive_product", { p_organization_id: organizationId, p_id: id }));
  } else if (operation === "inventory") {
    ({ error } = await supabase.rpc("record_inventory_movement", {
      p_organization_id: organizationId, p_product_id: id, p_quantity: Number(text(data, "quantity", 20)), p_notes: text(data, "notes") || null,
    }));
  } else if (operation === "save_customer" || operation === "save_supplier") {
    ({ error } = await supabase.rpc(operation, {
      p_organization_id: organizationId, p_id: id, p_name: text(data, "name", 120), p_document: text(data, "document", 20) || null,
      p_phone: text(data, "phone", 20) || null, p_email: text(data, "email", 254) || null, p_address: text(data, "address") || null,
    }));
  } else if (operation === "archive_customer" || operation === "archive_supplier") {
    ({ error } = await supabase.rpc(operation, { p_organization_id: organizationId, p_id: id }));
  } else if (operation === "cash") {
    ({ error } = await supabase.rpc("record_cash_movement", {
      p_organization_id: organizationId, p_movement_type: text(data, "movement_type", 10), p_amount: Number(text(data, "amount", 20)),
      p_payment_method: text(data, "payment_method", 20), p_description: text(data, "description"),
    }));
  } else if (operation === "settings") {
    ({ error } = await supabase.rpc("update_organization_settings", {
      p_organization_id: organizationId, p_name: text(data, "name", 120), p_business_type: text(data, "business_type", 80),
    }));
  } else {
    redirect(`/app?modulo=${back}&error=Operacion+invalida`);
  }

  revalidatePath("/app");
  redirect(`/app?modulo=${back}&org=${organizationId}&${error ? `error=${encodeURIComponent(error.message)}` : "saved=1"}`);
}
