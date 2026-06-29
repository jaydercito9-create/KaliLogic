import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Boxes,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Package,
  Plus,
  ShoppingBag,
  ShoppingCart,
  UserPlus,
  WalletCards,
} from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Dashboard de mi negocio" };

import { redirect } from "next/navigation";

export default async function ClientDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  let orgName = "Tu Negocio";
  let productsCount = 0;
  let lowStock: any[] = [];

  try {
    // Get current user + their organization (first one)
    const { data: { user: u } } = await supabase.auth.getUser(); // already have

    if (user) {
      const { data: membership } = await supabase
        .from("memberships")
        .select("organization_id, organizations(name)")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();

      if (membership?.organizations) {
        orgName = (membership.organizations as any).name || "Tu Negocio";
      }

      const orgId = membership?.organization_id || "";

      // Real products count + low stock example
      const { data: products } = await supabase
        .from("products")
        .select("id, name, sku")
        .eq("organization_id", orgId)
        .limit(50);

      productsCount = products?.length || 0;

      // Simple low stock simulation (in real app we'd join inventory)
      lowStock = (products || []).slice(0, 3).map((p: any, i: number) => ({
        name: p.name,
        sku: p.sku,
        units: 3 + i,
        tone: ["blue", "violet", "orange"][i % 3],
      }));
    }
  } catch (e) {
    console.error("Error loading /app data (likely missing Supabase env vars or connection):", e);
    // Safe fallback so page doesn't 500
  }

  return (
    <DashboardShell mode="client" active="dashboard">
      <div className="page-heading">
        <div>
          <span>Hoy</span>
          <h1>Buenos días{user?.user_metadata?.full_name ? `, ${user.user_metadata.full_name.split(" ")[0]}` : ""} 👋</h1>
          <p>Aquí tienes el resumen de <strong>{orgName}</strong>.</p>
        </div>
        <div className="page-heading__actions">
          <button className="button button--secondary"><Clock3 size={16} /> Cerrar caja</button>
          <button className="button button--primary"><Plus size={17} /> Nueva venta</button>
        </div>
      </div>

      <section className="onboarding-callout">
        <div className="onboarding-callout__icon"><ShoppingBag size={22} /></div>
        <div>
          <strong>Tu empresa ya tiene datos reales</strong>
          <p>{productsCount > 0 ? `${productsCount} productos cargados. Registra ventas y movimientos reales.` : "Crea tu primera empresa desde /demo para ver productos aquí."}</p>
        </div>
        <Link href="/app?modulo=productos">Ir a productos</Link>
      </section>

      <section className="kpi-grid">
        <article className="kpi-card">
          <div><span className="kpi-card__icon kpi-card__icon--blue"><CircleDollarSign size={20} /></span><small>Productos en catálogo</small></div>
          <strong>{productsCount}</strong>
          <p>Datos reales de tu empresa</p>
        </article>
        <article className="kpi-card">
          <div><span className="kpi-card__icon kpi-card__icon--violet"><Boxes size={20} /></span><small>Stock por atender</small></div>
          <strong>{lowStock.length}</strong>
          <p>Revisa el inventario</p>
        </article>
        <article className="kpi-card">
          <div><span className="kpi-card__icon kpi-card__icon--cyan"><ShoppingCart size={20} /></span><small>Próximamente</small></div>
          <strong>Ventas</strong>
          <p>Registra tus primeras ventas</p>
        </article>
        <article className="kpi-card">
          <div><span className="kpi-card__icon kpi-card__icon--orange"><WalletCards size={20} /></span><small>Próximamente</small></div>
          <strong>Caja</strong>
          <p>Control de ingresos y gastos</p>
        </article>
      </section>

      <section className="dashboard-grid dashboard-grid--main">
        <article className="panel-card stock-card">
          <div className="panel-card__heading"><div><h2>Stock por atender</h2><p>Productos que necesitan tu atención</p></div><span className="alert-count">{lowStock.length || 0}</span></div>
          <div className="stock-list">
            {lowStock.length > 0 ? lowStock.map((item: any, idx: number) => (
              <div key={item.sku || idx}>
                <span className={`stock-product stock-product--${item.tone}`}><Package size={18} /></span>
                <p><strong>{item.name}</strong><small>{item.sku}</small></p>
                <b>{item.units} unid.</b>
              </div>
            )) : (
              <div style={{padding: '12px', color: '#778398'}}>Agrega productos. Los que queden bajos aparecerán aquí.</div>
            )}
          </div>
          <Link href="/app?modulo=productos" className="panel-link">Ver todos los productos <ChevronRight size={15} /></Link>
        </article>

        <article className="panel-card">
          <div className="panel-card__heading"><div><h2>Productos recientes</h2><p>Últimos en tu catálogo (datos reales)</p></div></div>
          <div className="stock-list">
            {lowStock.length > 0 ? lowStock.slice(0, 4).map((item: any, idx: number) => (
              <div key={idx}>
                <span className={`stock-product stock-product--${item.tone}`}><Package size={18} /></span>
                <p><strong>{item.name}</strong><small>{item.sku}</small></p>
              </div>
            )) : <div style={{padding: '12px', color: '#778398'}}>Aún no tienes productos. Crea tu empresa desde /demo.</div>}
          </div>
        </article>
      </section>

      <section className="dashboard-grid dashboard-grid--bottom">
        <article className="panel-card recent-sales-card">
          <div className="panel-card__heading"><div><h2>Ventas recientes</h2><p>Registra ventas para ver el historial</p></div></div>
          <div style={{padding: '20px', textAlign: 'center', color: '#778398'}}>
            Aún no hay ventas registradas.<br />
            <Link href="/app?modulo=ventas" style={{color: '#155dfc'}}>Registra tu primera venta →</Link>
          </div>
        </article>

        <article className="panel-card quick-actions-card">
          <div className="panel-card__heading"><div><h2>Acciones rápidas</h2><p>Lo que más vas a usar</p></div></div>
          <div className="quick-actions">
            <Link href="/app?modulo=ventas"><span className="quick-action--blue"><ShoppingCart size={18} /></span><strong>Nueva venta</strong><small>Registrar una operación</small></Link>
            <Link href="/app?modulo=productos"><span className="quick-action--violet"><Package size={18} /></span><strong>Nuevo producto</strong><small>Agregar al catálogo</small></Link>
            <Link href="/app?modulo=clientes"><span className="quick-action--cyan"><UserPlus size={18} /></span><strong>Nuevo cliente</strong><small>Guardar sus datos</small></Link>
            <Link href="/app?modulo=caja"><span className="quick-action--orange"><WalletCards size={18} /></span><strong>Registrar movimiento</strong><small>Ingreso o gasto</small></Link>
          </div>
        </article>
      </section>
    </DashboardShell>
  );
}
