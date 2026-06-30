"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function manageOrganization(formData: FormData) {
  const organizationId = String(formData.get("organization_id") ?? "");
  const operation = String(formData.get("operation") ?? "");
  if (!UUID.test(organizationId)) throw new Error("Organización inválida");

  const supabase = await createClient();
  let result: { error: { message: string } | null };

  if (operation === "status") {
    const status = String(formData.get("status") ?? "");
    if (!["trial", "active", "suspended", "cancelled"].includes(status)) throw new Error("Estado inválido");
    result = await supabase.rpc("admin_set_organization_status", { p_organization_id: organizationId, p_status: status });
  } else if (operation === "plan") {
    const planCode = String(formData.get("plan_code") ?? "");
    if (!["basic", "premium", "plus"].includes(planCode)) throw new Error("Plan inválido");
    result = await supabase.rpc("admin_set_plan", { p_organization_id: organizationId, p_plan_code: planCode });
  } else if (operation === "trial") {
    const trialEnd = new Date(String(formData.get("trial_end") ?? ""));
    if (!Number.isFinite(trialEnd.getTime()) || trialEnd <= new Date()) throw new Error("Fecha de trial inválida");
    result = await supabase.rpc("admin_extend_trial", { p_organization_id: organizationId, p_expires_at: trialEnd.toISOString() });
  } else {
    throw new Error("Operación inválida");
  }

  if (result.error) throw new Error(result.error.message);
  revalidatePath("/control");
}
