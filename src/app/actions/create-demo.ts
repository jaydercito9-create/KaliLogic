"use server";

import { createServiceClient } from "@/lib/supabase/service";

export type DemoFormData = {
  full_name: string;
  company_name: string;
  email: string;
  phone: string;
  business_type: string;
};

/**
 * Crea TODO de forma real usando service role:
 * - Lead
 * - Usuario en Auth (con contraseña temporal)
 * - Organización + Trial 24h + Membership owner
 * - Almacén principal
 * - Productos de ejemplo según rubro + stock inicial
 */
export async function createDemo(data: DemoFormData) {
  let service;
  try {
    service = createServiceClient();
  } catch (e) {
    return { success: false, error: "Faltan las variables de Supabase en el servidor (URL o SERVICE_ROLE_KEY). Configúralas en Vercel." };
  }

  try {
    // 1. Guardar lead (siempre)
    const { error: leadErr } = await service.from("leads").insert({
      full_name: data.full_name,
      company_name: data.company_name,
      email: data.email,
      phone: data.phone,
      business_type: data.business_type,
      consented_at: new Date().toISOString(),
    });
    if (leadErr) {
      console.error("Lead error:", leadErr);
    }

    // 2. Crear el usuario con admin (service role)
    const tempPassword = "Demo2026!";

    const { data: createdUser, error: userErr } = await service.auth.admin.createUser({
      email: data.email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name: data.full_name,
        phone: data.phone,
      },
    });

    if (userErr) {
      console.warn("createUser warning:", userErr.message);
    }

    let userId: string | null = createdUser?.user?.id ?? null;

    if (!userId) {
      // Buscar por email
      const { data: listData } = await service.auth.admin.listUsers();
      const found = listData?.users?.find((u: any) => u.email?.toLowerCase() === data.email.toLowerCase());
      userId = found?.id ?? null;
    }

    if (!userId) {
      return { success: false, error: "No se pudo crear ni localizar el usuario en Supabase Auth." };
    }

    // 3. Si el usuario ya tiene una membresía activa, no crear otra org (evita duplicados)
    const { data: existing } = await service
      .from("memberships")
      .select("organization_id, organizations(name)")
      .eq("user_id", userId)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (existing?.organization_id) {
      return {
        success: true,
        tempPassword,
        organizationId: existing.organization_id,
        companyName: (existing as any).organizations?.name || data.company_name,
        email: data.email,
        alreadyExists: true,
      };
    }

    // 3. Crear organización (slug único para evitar conflictos)
    const baseSlug = data.company_name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "negocio";

    const slug = `${baseSlug}-${Date.now().toString(36).slice(-6)}`;

    const { data: org, error: orgErr } = await service
      .from("organizations")
      .insert({
        name: data.company_name,
        slug,
        business_type: data.business_type,
        status: "trial",
        is_internal: false,
      })
      .select()
      .single();

    if (orgErr || !org) {
      console.error("Org error:", orgErr);
      return { success: false, error: "No se pudo crear la empresa." };
    }

    // 4. Trial de 24 horas
    const now = new Date();
    const expires = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    await service.from("trials").insert({
      organization_id: org.id,
      status: "active",
      started_at: now.toISOString(),
      expires_at: expires.toISOString(),
    });

    // 5. Membership como owner
    await service.from("memberships").insert({
      organization_id: org.id,
      user_id: userId,
      role: "owner",
      is_active: true,
    });

    // 6. Almacén principal
    const { data: wh } = await service
      .from("warehouses")
      .insert({
        organization_id: org.id,
        name: "Principal",
        is_primary: true,
      })
      .select()
      .single();

    // 7. Sembrar productos reales según rubro
    await seedRealDemoData(service, org.id, wh?.id || null, data.business_type);

    return {
      success: true,
      tempPassword,
      organizationId: org.id,
      companyName: data.company_name,
      email: data.email,
    };
  } catch (e: any) {
    console.error("createDemo fatal error:", e);
    return { success: false, error: "Error interno al crear el demo. Revisa las variables de entorno." };
  }
}

async function seedRealDemoData(
  service: ReturnType<typeof createServiceClient>,
  orgId: string,
  warehouseId: string | null,
  businessType: string
) {
  const bt = businessType.toLowerCase();
  let items: Array<{ name: string; sku: string; category: string; sale: number; cost: number }> = [];

  if (bt.includes("cosm")) {
    items = [
      { name: "Crema Hidratante Facial", sku: "CRE-HID-001", category: "Cremas", sale: 45, cost: 22 },
      { name: "Aceite de Argán 30ml", sku: "ACE-ARG-030", category: "Aceites", sale: 65, cost: 31 },
      { name: "Máscara de Pestañas", sku: "MAS-VOL-01", category: "Maquillaje", sale: 38, cost: 18 },
    ];
  } else if (bt.includes("ropa")) {
    items = [
      { name: "Polo Essential", sku: "POL-ESS-BLA", category: "Polos", sale: 59.9, cost: 28 },
      { name: "Camisa Oxford", sku: "CAM-OXF-AZU", category: "Camisas", sale: 89, cost: 42 },
    ];
  } else if (bt.includes("calzado")) {
    items = [
      { name: "Zapatilla Urban", sku: "ZAP-URB-BLA", category: "Zapatillas", sale: 149.9, cost: 78 },
      { name: "Sandalia Casual", sku: "SAN-CAS-NEG", category: "Sandalias", sale: 69, cost: 32 },
    ];
  } else if (bt.includes("bodega") || bt.includes("bazar")) {
    items = [
      { name: "Arroz 1kg", sku: "ARO-1KG", category: "Abarrotes", sale: 8.5, cost: 5.2 },
      { name: "Aceite 1L", sku: "ACE-1L", category: "Abarrotes", sale: 12.9, cost: 7.8 },
    ];
  } else {
    items = [
      { name: "Producto de Ejemplo", sku: "EJ-001", category: "General", sale: 25, cost: 12 },
    ];
  }

  for (const it of items) {
    const { data: prod } = await service
      .from("products")
      .insert({
        organization_id: orgId,
        name: it.name,
        sku: it.sku,
        category: it.category,
        sale_price: it.sale,
        cost_price: it.cost,
        has_variants: false,
      })
      .select()
      .single();

    if (prod && warehouseId) {
      const qty = Math.floor(Math.random() * 35) + 15;
      await service.from("inventory_balances").insert({
        organization_id: orgId,
        warehouse_id: warehouseId,
        product_id: prod.id,
        quantity: qty,
        minimum_quantity: 5,
      });

      await service.from("stock_movements").insert({
        organization_id: orgId,
        warehouse_id: warehouseId,
        product_id: prod.id,
        movement_type: "initial",
        quantity: qty,
        notes: "Stock inicial",
      });
    }
  }
}

// Legacy alias por si algo lo llama
export const createDemoLead = createDemo;
