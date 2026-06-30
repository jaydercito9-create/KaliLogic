import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { verifyMercadoPagoSignature } from "@/app/api/mercadopago/webhook/signature";

export async function POST(request: NextRequest) {
  const dataId = request.nextUrl.searchParams.get("data.id") ?? request.nextUrl.searchParams.get("data_id") ?? "";
  if (!dataId || !verifyMercadoPagoSignature(request.headers.get("x-signature") ?? "", request.headers.get("x-request-id") ?? "", dataId, process.env.MERCADOPAGO_WEBHOOK_SECRET ?? "")) return new NextResponse(null, { status: 401 });
  const event = await request.json() as { id?: string | number; type?: string; action?: string };
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!event.id || !token || !serviceKey || !url) return new NextResponse(null, { status: 500 });

  let subscriptionId = dataId;
  let paymentStatus: string | undefined;
  if (event.type === "subscription_authorized_payment") {
    const invoiceResponse = await fetch(`https://api.mercadopago.com/authorized_payments/${encodeURIComponent(dataId)}`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
    if (!invoiceResponse.ok) return new NextResponse(null, { status: 502 });
    const invoice = await invoiceResponse.json() as { preapproval_id?: string; payment?: { status?: string } };
    if (!invoice.preapproval_id) return new NextResponse(null, { status: 422 });
    subscriptionId = invoice.preapproval_id;
    paymentStatus = invoice.payment?.status;
  } else if (event.type !== "subscription_preapproval") {
    return NextResponse.json({ ignored: true });
  }

  const providerResponse = await fetch(`https://api.mercadopago.com/preapproval/${encodeURIComponent(subscriptionId)}`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
  if (!providerResponse.ok) return new NextResponse(null, { status: 502 });
  const subscription = await providerResponse.json() as { id: string; external_reference?: string; status?: string; next_payment_date?: string };
  if (!subscription.external_reference) return new NextResponse(null, { status: 422 });
  const providerStatus = paymentStatus && !["approved", "pending", "in_process"].includes(paymentStatus) ? "past_due" : subscription.status ?? "pending";

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await admin.rpc("sync_mercadopago_subscription", {
    p_event_id: String(event.id), p_event_type: event.type ?? event.action ?? "unknown", p_provider_subscription_id: subscription.id,
    p_external_reference: subscription.external_reference, p_provider_status: providerStatus,
    p_next_payment_at: subscription.next_payment_date ?? null, p_payload: subscription,
  });
  if (error) return new NextResponse(null, { status: 500 });
  return NextResponse.json({ ok: true });
}
