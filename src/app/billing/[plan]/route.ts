import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest, { params }: { params: Promise<{ plan: string }> }) {
  const { plan } = await params;
  if (!["basic", "premium", "plus"].includes(plan)) return NextResponse.redirect(new URL("/#planes", request.url));
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.redirect(new URL(`/demo?plan=${plan}`, request.url));

  const [{ data: membership }, { data: selectedPlan }] = await Promise.all([
    supabase.from("memberships").select("organization_id").eq("user_id", user.id).eq("is_active", true).limit(1).maybeSingle(),
    supabase.from("plans").select("name,monthly_price").eq("code", plan).eq("is_active", true).single(),
  ]);
  if (!membership?.organization_id) return NextResponse.redirect(new URL(`/demo?plan=${plan}`, request.url));
  if (!selectedPlan || !process.env.MERCADOPAGO_ACCESS_TOKEN) return NextResponse.redirect(new URL("/?billing=not_configured#planes", request.url));

  const response = await fetch("https://api.mercadopago.com/preapproval", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      reason: `KaliLogic ${selectedPlan.name}`,
      external_reference: `${membership.organization_id}:${plan}`,
      payer_email: user.email,
      auto_recurring: { frequency: 1, frequency_type: "months", transaction_amount: Number(selectedPlan.monthly_price), currency_id: "PEN" },
      back_url: `${request.nextUrl.origin}/app?billing=return`,
      status: "pending",
    }),
    cache: "no-store",
  });
  const checkout = await response.json() as { id?: string; init_point?: string };
  if (!response.ok || !checkout.id || !checkout.init_point) return NextResponse.redirect(new URL("/?billing=error#planes", request.url));

  const { error } = await supabase.rpc("start_subscription_checkout", {
    p_organization_id: membership.organization_id, p_plan_code: plan, p_provider_subscription_id: checkout.id,
  });
  if (error) return NextResponse.redirect(new URL("/?billing=error#planes", request.url));
  return NextResponse.redirect(checkout.init_point);
}
