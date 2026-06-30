"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

const BUSINESS_TYPES = new Set([
  "Tienda de ropa",
  "Tienda de calzado",
  "Bodega o bazar",
  "Ferretería",
  "Cosmética y belleza",
  "Otro comercio",
]);

export type DemoFormData = {
  full_name: string;
  company_name: string;
  email: string;
  phone: string;
  business_type: string;
  accepted_terms: boolean;
};

function validateDemo(data: Partial<DemoFormData>) {
  const fullName = data.full_name?.trim();
  const companyName = data.company_name?.trim();
  const email = data.email?.trim().toLowerCase();
  const phone = data.phone?.replace(/\D/g, "");

  if (!data.accepted_terms) return { error: "Debes aceptar los términos y la política de privacidad." };
  if (!fullName || fullName.length < 2 || fullName.length > 100) return { error: "Nombre inválido." };
  if (!companyName || companyName.length < 2 || companyName.length > 120) return { error: "Nombre de negocio inválido." };
  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Correo inválido." };
  if (!phone || phone.length < 9 || phone.length > 15) return { error: "WhatsApp inválido." };
  if (typeof data.business_type !== "string" || !BUSINESS_TYPES.has(data.business_type)) return { error: "Tipo de negocio inválido." };

  return { fullName, companyName, email, phone };
}

export async function createDemo(value: unknown) {
  if (!value || typeof value !== "object") return { success: false as const, error: "Solicitud inválida." };
  const data = value as Partial<DemoFormData>;
  const valid = validateDemo(data);
  if ("error" in valid) return { success: false as const, error: valid.error };

  try {
    const requestHeaders = await headers();
    const ip = (requestHeaders.get("x-forwarded-for")?.split(",")[0] ?? requestHeaders.get("x-real-ip") ?? "").trim();
    const ipHash = ip ? createHash("sha256").update(ip).digest("hex") : null;
    const supabase = await createClient();
    const { error } = await supabase.rpc("submit_demo_request", {
      p_full_name: valid.fullName,
      p_company_name: valid.companyName,
      p_email: valid.email,
      p_phone: valid.phone,
      p_business_type: data.business_type as string,
      p_request_ip_hash: ipHash,
      p_accepted_terms: data.accepted_terms === true,
    });
    if (error?.message.includes("rate limit")) {
      return { success: false as const, error: "Demasiados intentos. Inténtalo nuevamente en una hora." };
    }
    if (error) throw error;

    return { success: true as const, email: valid.email };
  } catch (error) {
    console.error("CREATE DEMO ERROR FULL:", error);

    const message =
      error && typeof error === "object" && "message" in error
        ? String((error as { message?: unknown }).message || "")
        : "";
    if (message.includes("rate limit")) {
      return { success: false as const, error: "Demasiados intentos. Inténtalo nuevamente en una hora." };
    }
    return { success: false as const, error: "No se pudo registrar la solicitud. Inténtalo de nuevo." };
  }
}
