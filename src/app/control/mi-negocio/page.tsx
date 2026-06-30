import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  Boxes,
  CircleDollarSign,
  Package,
  Plus,
  ShoppingCart,
  Store,
  WalletCards,
} from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Mi tienda — Control" };

type Product = { id: string; name: string; sku: string; sale_price: number | string; category: string | null };

import { redirect } from "next/navigation";

export default async function MyBusinessPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Only platform admins should access their internal store this way
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_platform_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_platform_admin) redirect("/app");

  let tiendaName = "Tu Tienda Interna";
  let orgId: string | null = null;
  let productos: Product[] = [];
  let productCount = 0;

  const { data: membership } = await supabase
    .from("memberships")
    .select("organization_id, organizations(name, is_internal)")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  const org = membership?.organizations as { name?: string; is_internal?: boolean } | null;
  if (org?.is_internal) {
    tiendaName = org.name || "Tu Tienda Interna";
    orgId = membership?.organization_id || null;
  } else {
    const { data: internal } = await supabase
      .from("organizations")
      .select("id, name")
      .eq("is_internal", true)
      .limit(1)
      .maybeSingle();
    tiendaName = internal?.name || "KaliLogic - Tienda Propia (Jayder)";
    orgId = internal?.id || null;
  }

  if (orgId) {
    const [recent, total] = await Promise.all([
      supabase.from("products").select("id, name, sku, sale_price, category").eq("organization_id", orgId).limit(10),
      supabase.from("products").select("id", { count: "exact", head: true }).eq("organization_id", orgId),
    ]);
    productos = (recent.data || []) as Product[];
    productCount = total.count ?? 0;
  }

  return (
    <DashboardShell mode="control" active="my-store">
      <div className="business-context-bar">
        <Link href="/control"><ArrowLeft size={14} /> Volver a KaliLogic</Link>
        <span><i /> Estás administrando tu empresa: <strong>{tiendaName}</strong></span>
      </div>

      <div className="page-heading">
        <div><span>Mi empresa</span><h1>Operación de mi tienda</h1><p>El mismo control que ofreces a tus clientes, dentro de tu panel principal.</p></div>
        <div className="page-heading__actions"><button className="button button--secondary"><Package size={16} /> Nuevo producto</button><button className="button button--primary"><Plus size={17} /> Nueva venta</button></div>
      </div>

      <section className="kpi-grid">
        <article className="kpi-card"><div><span className="kpi-card__icon kpi-card__icon--blue"><CircleDollarSign size={20} /></span><small>Productos</small></div><strong>{productCount}</strong><p>Total real</p></article>
        <article className="kpi-card"><div><span className="kpi-card__icon kpi-card__icon--violet"><Boxes size={20} /></span><small>Catálogo</small></div><strong>Real</strong><p>Tu tienda</p></article>
        <article className="kpi-card"><div><span className="kpi-card__icon kpi-card__icon--cyan"><ShoppingCart size={20} /></span><small>Ventas</small></div><strong>—</strong><p>Próximamente</p></article>
        <article className="kpi-card"><div><span className="kpi-card__icon kpi-card__icon--orange"><WalletCards size={20} /></span><small>Caja</small></div><strong>—</strong><p>Próximamente</p></article>
      </section>

      <section className="dashboard-grid own-store-grid">
        <article className="panel-card own-store-shortcuts">
          <div className="panel-card__heading"><div><h2>Administrar mi negocio</h2><p>Accesos principales de tu propia tienda</p></div><Store size={18} /></div>
          <div className="store-module-grid">
            <Link href="/control/mi-negocio?modulo=ventas"><span><ShoppingCart size={21} /></span><strong>Ventas</strong><small>Punto de venta y devoluciones</small></Link>
            <Link href="/control/mi-negocio?modulo=productos"><span><Package size={21} /></span><strong>Productos</strong><small>Catálogo, precios y variantes</small></Link>
            <Link href="/control/mi-negocio?modulo=inventario"><span><Boxes size={21} /></span><strong>Inventario</strong><small>Stock y movimientos</small></Link>
            <Link href="/control/mi-negocio?modulo=caja"><span><WalletCards size={21} /></span><strong>Caja</strong><small>Ingresos, gastos y cierre</small></Link>
          </div>
        </article>

        <article className="panel-card">
          <div className="panel-card__heading"><div><h2>Productos de tu tienda</h2><p>Datos reales de {tiendaName}</p></div></div>
          <div className="stock-list">
            {productos.length > 0 ? productos.map((p, i) => (
              <div key={i}>
                <span className="stock-product stock-product--blue"><Package size={18} /></span>
                <p><strong>{p.name}</strong><small>{p.sku} · S/ {p.sale_price}</small></p>
              </div>
            )) : <div style={{padding:'12px', color:'#778398'}}>Aún no hay productos. Agrega desde el demo o sección de productos.</div>}
          </div>
        </article>
      </section>

      <section className="panel-card own-store-note">
        <span><Store size={18} /></span><div><strong>Una sola sesión, dos responsabilidades</strong><p>Tu tienda está registrada como una organización interna de KaliLogic. Solo tú puedes verla desde este apartado del superadministrador.</p></div>
      </section>
    </DashboardShell>
  );
}
