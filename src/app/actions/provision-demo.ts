"use server";

import { createServiceClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";

export async function provisionDemoOrganization(formData: {
  companyName: string;
  businessType: string;
}) {
  const supabase = await createClient(); // for current user session
  const service = createServiceClient();

  // Get the authenticated user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return { success: false, error: "Debes iniciar sesión primero" };
  }

  // Check if this user already has an organization
  const { data: existingMembership } = await supabase
    .from("memberships")
    .select("organization_id")
    .eq("user_id", user.id)
    .limit(1)
    .single();

  if (existingMembership) {
    return { success: true, organizationId: existingMembership.organization_id, alreadyExists: true };
  }

  // 1. Create the organization
  const slug = formData.companyName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  const { data: org, error: orgError } = await service
    .from("organizations")
    .insert({
      name: formData.companyName,
      slug: slug || `negocio-${Date.now()}`,
      business_type: formData.businessType,
      status: "trial",
      is_internal: false,
    })
    .select()
    .single();

  if (orgError || !org) {
    console.error("Org creation error:", orgError);
    return { success: false, error: "No se pudo crear la empresa" };
  }

  // 2. Create 24h trial
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  await service.from("trials").insert({
    organization_id: org.id,
    status: "active",
    started_at: now.toISOString(),
    expires_at: expiresAt.toISOString(),
  });

  // 3. Add the user as owner
  await service.from("memberships").insert({
    organization_id: org.id,
    user_id: user.id,
    role: "owner",
    is_active: true,
  });

  // 4. Create a default warehouse
  const { data: warehouse } = await service
    .from("warehouses")
    .insert({
      organization_id: org.id,
      name: "Principal",
      is_primary: true,
    })
    .select()
    .single();

  // 5. Seed products + variants + inventory according to business type
  await seedDemoData(service, org.id, warehouse?.id || null, formData.businessType);

  return { success: true, organizationId: org.id };
}

// Simple seeder per business type
async function seedDemoData(
  service: ReturnType<typeof createServiceClient>,
  orgId: string,
  warehouseId: string | null,
  businessType: string
) {
  const isCosmetica = businessType.toLowerCase().includes("cosm");
  const isRopa = businessType.toLowerCase().includes("ropa");
  const isCalzado = businessType.toLowerCase().includes("calzado");
  const isBodega = businessType.toLowerCase().includes("bodega") || businessType.toLowerCase().includes("bazar");

  let productsToCreate: any[] = [];

  if (isCosmetica) {
    productsToCreate = [
      { name: "Crema Hidratante Facial", sku: "CRE-HID-001", category: "Cremas", sale_price: 45, cost_price: 22 },
      { name: "Aceite de Argán 30ml", sku: "ACE-ARG-030", category: "Aceites", sale_price: 65, cost_price: 31 },
      { name: "Máscara de Pestañas Volumen", sku: "MAS-PES-VOL", category: "Maquillaje", sale_price: 38, cost_price: 18 },
    ];
  } else if (isRopa) {
    productsToCreate = [
      { name: "Polo Essential", sku: "POL-ESS-BLA-M", category: "Polos", sale_price: 59.9, cost_price: 28 },
      { name: "Camisa Oxford", sku: "CAM-OXF-AZU", category: "Camisas", sale_price: 89, cost_price: 42 },
    ];
  } else if (isCalzado) {
    productsToCreate = [
      { name: "Zapatilla Urban", sku: "ZAP-URB-BLA-38", category: "Zapatillas", sale_price: 149.9, cost_price: 78 },
      { name: "Sandalia Casual", sku: "SAN-CAS-NEG", category: "Sandalias", sale_price: 69, cost_price: 32 },
    ];
  } else if (isBodega) {
    productsToCreate = [
      { name: "Arroz 1kg", sku: "ARO-1KG", category: "Abarrotes", sale_price: 8.5, cost_price: 5.2 },
      { name: "Aceite Vegetal 1L", sku: "ACE-VEG-1L", category: "Abarrotes", sale_price: 12.9, cost_price: 7.8 },
    ];
  } else {
    productsToCreate = [
      { name: "Producto Genérico 1", sku: "GEN-001", category: "General", sale_price: 25, cost_price: 12 },
      { name: "Producto Genérico 2", sku: "GEN-002", category: "General", sale_price: 40, cost_price: 19 },
    ];
  }

  for (const p of productsToCreate) {
    const { data: product } = await service
      .from("products")
      .insert({
        organization_id: orgId,
        name: p.name,
        sku: p.sku,
        category: p.category,
        sale_price: p.sale_price,
        cost_price: p.cost_price,
        has_variants: false,
      })
      .select()
      .single();

    if (product && warehouseId) {
      await service.from("inventory_balances").insert({
        organization_id: orgId,
        warehouse_id: warehouseId,
        product_id: product.id,
        quantity: Math.floor(Math.random() * 40) + 12,
        minimum_quantity: 5,
      });

      // Initial stock movement
      await service.from("stock_movements").insert({
        organization_id: orgId,
        warehouse_id: warehouseId,
        product_id: product.id,
        movement_type: "initial",
        quantity: Math.floor(Math.random() * 40) + 12,
        notes: "Stock inicial de demostración",
      });
    }
  }
}
