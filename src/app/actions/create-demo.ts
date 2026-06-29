"use server";

import { createServiceClient } from "@/lib/supabase/service";

export type DemoFormData = {
  full_name: string;
  company_name: string;
  email: string;
  phone: string;
  business_type: string;
};

export async function createDemoLead(data: DemoFormData) {
  // Usamos service role para crear leads desde el formulario público (antes de que el usuario tenga cuenta)
  const supabase = createServiceClient();

  const { error } = await supabase.from("leads").insert({
    full_name: data.full_name,
    company_name: data.company_name,
    email: data.email,
    phone: data.phone,
    business_type: data.business_type,
    consented_at: new Date().toISOString(),
  });

  if (error) {
    console.error("Error creating lead:", error);
    return { success: false, error: "No pudimos registrar tu solicitud. Intenta más tarde." };
  }

  return { success: true };
}
