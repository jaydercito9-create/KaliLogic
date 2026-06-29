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

export default async function ClientDashboardPage() {
  const supabase = await createClient();

  // Get current user + their organization (first one)
  const { data: { user } } = await supabase.auth.getUser();

  let orgName = "Tu Negocio";
  let productsCount = 0;
  let lowStock: any[] = [];

  // Fallback demo sales for UI
  const sales = [
    { code: "V-1048", customer: "María Torres", time: "Hace 8 min", amount: "S/ 189.90", method: "Yape", status: "Completada" },
    { code: "V-1047", customer: "Carlos Pérez", time: "Hace 26 min", amount: "S/ 349.80", method: "Tarjeta", status: "Completada" },
    { code: "V-1046", customer: "Venta mostrador", time: "Hace 41 min", amount: "S/ 79.90", method: "Efectivo", status: "Completada" },
    { code: "V-1045", customer: "Ana Jiménez", time: "Hace 1 h", amount: "S/ 219.70", method: "Plin", status: "Completada" },
  ];

  if (user) {
    const { data: membership } = await supabase
      .from("memberships")
      .select("organization_id, organizations(name)")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .limit(1)
      .single();

    if (membership?.organizations) {
      orgName = (membership.organizations as any).name || "Tu Negocio";
    }

    // Real products count + low stock example
    const { data: products } = await supabase
      .from("products")
      .select("id, name, sku")
      .eq("organization_id", membership?.organization_id || "")
      .limit(50);

    productsCount = products?.length || 0;

    // Simple low stock simulation (in real app we'd join inventory)
    lowStock = (products || []).slice(0, 3).map((p, i) => ({
      name: p.name,
      sku: p.sku,
      units: 3 + i,
      tone: ["blue", "violet", "orange"][i % 3],
    }));
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
          <p>{productsCount > 0 ? `${productsCount} productos cargados. Este es tu espacio real.` : "Completa tu demo para que se creen productos de ejemplo."}</p>
        </div>
        <button>Continuar configuración <ArrowRight size={15} /></button>
      </section>

      <section className="kpi-grid">
        <article className="kpi-card">
          <div><span className="kpi-card__icon kpi-card__icon--blue"><CircleDollarSign size={20} /></span><small>Ventas de hoy</small></div>
          <strong>S/ 2,840.50</strong>
          <p><span className="trend trend--up"><ArrowUpRight size={13} /> 18.4%</span> frente a ayer</p>
          <i className="kpi-spark kpi-spark--blue" />
        </article>
        <article className="kpi-card">
          <div><span className="kpi-card__icon kpi-card__icon--violet"><WalletCards size={20} /></span><small>Utilidad estimada</small></div>
          <strong>S/ 1,126.20</strong>
          <p><span className="trend trend--up"><ArrowUpRight size={13} /> 12.1%</span> margen 39.6%</p>
          <i className="kpi-spark kpi-spark--violet" />
        </article>
        <article className="kpi-card">
          <div><span className="kpi-card__icon kpi-card__icon--cyan"><ShoppingCart size={20} /></span><small>Ventas realizadas</small></div>
          <strong>24</strong>
          <p><span className="trend trend--up"><ArrowUpRight size={13} /> 4 más</span> ticket S/ 118.35</p>
          <i className="kpi-spark kpi-spark--cyan" />
        </article>
        <article className="kpi-card">
          <div><span className="kpi-card__icon kpi-card__icon--orange"><Boxes size={20} /></span><small>Stock por atender</small></div>
          <strong>6 productos</strong>
          <p><span className="trend trend--down"><ArrowDownRight size={13} /> 2 menos</span> que ayer</p>
          <i className="kpi-spark kpi-spark--orange" />
        </article>
      </section>

      <section className="dashboard-grid dashboard-grid--main">
        <article className="panel-card sales-chart-card">
          <div className="panel-card__heading">
            <div><h2>Rendimiento de ventas</h2><p>Ingresos registrados durante los últimos 7 días</p></div>
            <select aria-label="Periodo"><option>Últimos 7 días</option><option>Este mes</option></select>
          </div>
          <div className="chart-summary"><strong>S/ 14,680.90</strong><span className="trend trend--up"><ArrowUpRight size={13} /> 14.2%</span></div>
          <div className="main-chart">
            <div className="main-chart__labels"><span>S/ 4k</span><span>S/ 3k</span><span>S/ 2k</span><span>S/ 1k</span><span>S/ 0</span></div>
            <div className="main-chart__plot">
              <svg viewBox="0 0 700 190" preserveAspectRatio="none" aria-hidden="true">
                <defs>
                  <linearGradient id="clientArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#316bed" stopOpacity=".28" />
                    <stop offset="1" stopColor="#316bed" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d="M0 150 C50 145 60 115 115 124 S190 100 230 108 S315 63 355 80 S430 104 470 68 S545 25 585 48 S655 38 700 17 L700 190 L0 190Z" fill="url(#clientArea)" />
                <path d="M0 150 C50 145 60 115 115 124 S190 100 230 108 S315 63 355 80 S430 104 470 68 S545 25 585 48 S655 38 700 17" fill="none" stroke="#316bed" strokeWidth="4" strokeLinecap="round" />
                <circle cx="700" cy="17" r="5" fill="white" stroke="#316bed" strokeWidth="4" />
              </svg>
              <div className="main-chart__days"><span>Lun 23</span><span>Mar 24</span><span>Mié 25</span><span>Jue 26</span><span>Vie 27</span><span>Sáb 28</span><span>Dom 29</span></div>
            </div>
          </div>
        </article>

        <article className="panel-card stock-card">
          <div className="panel-card__heading"><div><h2>Stock bajo</h2><p>Necesitan tu atención</p></div><span className="alert-count">{lowStock.length || 3}</span></div>
          <div className="stock-list">
            {(lowStock.length ? lowStock : [
              { name: "Agrega productos reales", sku: "USA EL DEMO", units: 0, tone: "blue" }
            ]).map((item: any, idx: number) => (
              <div key={item.sku || idx}>
                <span className={`stock-product stock-product--${item.tone}`}><Package size={18} /></span>
                <p><strong>{item.name}</strong><small>{item.sku}</small></p>
                <b>{item.units} unid.</b>
              </div>
            ))}
          </div>
          <button className="panel-link">Ver todo el inventario <ChevronRight size={15} /></button>
        </article>
      </section>

      <section className="dashboard-grid dashboard-grid--bottom">
        <article className="panel-card recent-sales-card">
          <div className="panel-card__heading"><div><h2>Ventas recientes</h2><p>Últimos movimientos registrados</p></div><button className="panel-link panel-link--plain">Ver todas <ChevronRight size={15} /></button></div>
          <div className="data-table-wrap">
            <table className="data-table">
              <thead><tr><th>VENTA</th><th>CLIENTE</th><th>MÉTODO</th><th>ESTADO</th><th>TOTAL</th></tr></thead>
              <tbody>
                {sales.map((sale) => (
                  <tr key={sale.code}>
                    <td><strong>{sale.code}</strong><small>{sale.time}</small></td>
                    <td>{sale.customer}</td><td>{sale.method}</td>
                    <td><span className="status-pill status-pill--success">{sale.status}</span></td>
                    <td><strong>{sale.amount}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="panel-card quick-actions-card">
          <div className="panel-card__heading"><div><h2>Acciones rápidas</h2><p>Lo que más utilizas</p></div></div>
          <div className="quick-actions">
            <Link href="/app?modulo=ventas"><span className="quick-action--blue"><ShoppingCart size={18} /></span><strong>Nueva venta</strong><small>Registrar una operación</small></Link>
            <Link href="/app?modulo=productos"><span className="quick-action--violet"><Package size={18} /></span><strong>Nuevo producto</strong><small>Agregar al catálogo</small></Link>
            <Link href="/app?modulo=clientes"><span className="quick-action--cyan"><UserPlus size={18} /></span><strong>Nuevo cliente</strong><small>Guardar sus datos</small></Link>
            <Link href="/app?modulo=caja"><span className="quick-action--orange"><WalletCards size={18} /></span><strong>Registrar gasto</strong><small>Movimiento de caja</small></Link>
          </div>
        </article>
      </section>

      <div className="dashboard-hint"><AlertTriangle size={15} /><span>Los datos mostrados pertenecen a tu demo y puedes modificarlos libremente.</span></div>
    </DashboardShell>
  );
}
