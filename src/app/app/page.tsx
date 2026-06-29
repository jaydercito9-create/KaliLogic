import type { Metadata } from "next";
import Link from "next/link";
import {
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
  Wrench,
} from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Dashboard | KaliLogic" };

// ── Módulo: Próximamente ─────────────────────────────────────────────────────
function ComingSoon({ modulo, icon: Icon, desc }: { modulo: string; icon: any; desc: string }) {
  return (
    <div className="coming-soon-panel">
      <span className="coming-soon-panel__icon"><Icon size={32} /></span>
      <h2>{modulo}</h2>
      <p>{desc}</p>
      <Link href="/app" className="button button--secondary">← Volver al dashboard</Link>
    </div>
  );
}

// ── Módulo: Productos ────────────────────────────────────────────────────────
async function ProductosModule({ orgId, supabase }: { orgId: string; supabase: any }) {
  const { data: products } = await supabase
    .from("products")
    .select("id, name, sku, sale_price, category")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(30);

  return (
    <div>
      <div className="page-heading">
        <div><span>Catálogo</span><h1>Productos</h1><p>Todos los productos de tu negocio</p></div>
        <div className="page-heading__actions">
          <button className="button button--primary"><Plus size={16} /> Nuevo producto</button>
        </div>
      </div>
      <article className="panel-card">
        <div className="panel-card__heading">
          <div><h2>Catálogo completo</h2><p>{products?.length || 0} productos registrados</p></div>
        </div>
        <div className="data-table-wrap">
          <table className="data-table">
            <thead><tr><th>NOMBRE</th><th>SKU</th><th>CATEGORÍA</th><th>PRECIO</th></tr></thead>
            <tbody>
              {(products || []).length > 0 ? (products || []).map((p: any) => (
                <tr key={p.id}>
                  <td><strong>{p.name}</strong></td>
                  <td><span className="plan-chip">{p.sku}</span></td>
                  <td>{p.category || "—"}</td>
                  <td>S/ {Number(p.sale_price).toFixed(2)}</td>
                </tr>
              )) : (
                <tr><td colSpan={4} style={{ padding: "20px", color: "#778398", textAlign: "center" }}>
                  Aún no tienes productos. Agrega el primero.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </article>
    </div>
  );
}

// ── Módulo: Inventario ───────────────────────────────────────────────────────
async function InventarioModule({ orgId, supabase }: { orgId: string; supabase: any }) {
  const { data: balances } = await supabase
    .from("inventory_balances")
    .select("quantity, minimum_quantity, products(name, sku, category)")
    .eq("organization_id", orgId)
    .order("quantity", { ascending: true })
    .limit(30);

  return (
    <div>
      <div className="page-heading">
        <div><span>Almacén</span><h1>Inventario</h1><p>Stock actual de todos tus productos</p></div>
      </div>
      <article className="panel-card">
        <div className="panel-card__heading">
          <div><h2>Stock actual</h2><p>Ordenado por cantidad (menor primero)</p></div>
        </div>
        <div className="data-table-wrap">
          <table className="data-table">
            <thead><tr><th>PRODUCTO</th><th>SKU</th><th>STOCK</th><th>MÍNIMO</th><th>ESTADO</th></tr></thead>
            <tbody>
              {(balances || []).length > 0 ? (balances || []).map((b: any, i: number) => {
                const p = b.products as any;
                const low = b.quantity <= (b.minimum_quantity || 5);
                return (
                  <tr key={i}>
                    <td><strong>{p?.name || "—"}</strong></td>
                    <td><span className="plan-chip">{p?.sku || "—"}</span></td>
                    <td><strong>{b.quantity}</strong></td>
                    <td>{b.minimum_quantity || 5}</td>
                    <td>
                      <span className={low ? "status-pill status-pill--warning" : "status-pill status-pill--success"}>
                        {low ? "Stock bajo" : "OK"}
                      </span>
                    </td>
                  </tr>
                );
              }) : (
                <tr><td colSpan={5} style={{ padding: "20px", color: "#778398", textAlign: "center" }}>
                  Sin datos de inventario aún.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </article>
    </div>
  );
}

// ── Dashboard principal ──────────────────────────────────────────────────────
async function DashboardHome({ user, orgName, orgId, supabase }: any) {
  let productsCount = 0;
  let lowStock: any[] = [];

  try {
    const { data: products } = await supabase
      .from("products")
      .select("id")
      .eq("organization_id", orgId)
      .limit(200);
    productsCount = products?.length || 0;

    if (orgId && productsCount > 0) {
      const { data: balances } = await supabase
        .from("inventory_balances")
        .select("quantity, minimum_quantity, products(name, sku)")
        .eq("organization_id", orgId)
        .order("quantity", { ascending: true })
        .limit(6);
      const tones = ["blue", "violet", "orange"];
      lowStock = (balances || [])
        .filter((b: any) => b.products)
        .slice(0, 3)
        .map((b: any, i: number) => ({
          name: (b.products as any).name,
          sku: (b.products as any).sku,
          units: b.quantity,
          tone: tones[i % 3],
        }));
    }
  } catch {}

  const firstName = user?.user_metadata?.full_name?.split(" ")[0] || "";

  return (
    <>
      <div className="page-heading">
        <div>
          <span>Hoy</span>
          <h1>Buenos días{firstName ? `, ${firstName}` : ""} 👋</h1>
          <p>Resumen de <strong>{orgName}</strong></p>
        </div>
        <div className="page-heading__actions">
          <Link href="/app?modulo=caja" className="button button--secondary"><Clock3 size={16} /> Cerrar caja</Link>
          <Link href="/app?modulo=ventas" className="button button--primary"><Plus size={17} /> Nueva venta</Link>
        </div>
      </div>

      {productsCount === 0 && (
        <section className="onboarding-callout">
          <div className="onboarding-callout__icon"><ShoppingBag size={22} /></div>
          <div>
            <strong>Empieza cargando tus productos</strong>
            <p>Ve a <Link href="/app?modulo=productos">Productos</Link> para agregar tu catálogo.</p>
          </div>
          <Link href="/app?modulo=productos">Ir a productos</Link>
        </section>
      )}

      <section className="kpi-grid">
        <article className="kpi-card">
          <div><span className="kpi-card__icon kpi-card__icon--blue"><CircleDollarSign size={20} /></span><small>Productos</small></div>
          <strong>{productsCount}</strong>
          <p>En catálogo</p>
        </article>
        <article className="kpi-card">
          <div><span className="kpi-card__icon kpi-card__icon--violet"><Boxes size={20} /></span><small>Stock bajo</small></div>
          <strong>{lowStock.length}</strong>
          <p>Necesitan atención</p>
        </article>
        <article className="kpi-card">
          <div><span className="kpi-card__icon kpi-card__icon--cyan"><ShoppingCart size={20} /></span><small>Ventas</small></div>
          <strong>—</strong>
          <p>Próximamente</p>
        </article>
        <article className="kpi-card">
          <div><span className="kpi-card__icon kpi-card__icon--orange"><WalletCards size={20} /></span><small>Caja</small></div>
          <strong>—</strong>
          <p>Próximamente</p>
        </article>
      </section>

      <section className="dashboard-grid dashboard-grid--main">
        <article className="panel-card stock-card">
          <div className="panel-card__heading">
            <div><h2>Stock por atender</h2><p>Los que tienen menos unidades</p></div>
            <span className="alert-count">{lowStock.length}</span>
          </div>
          <div className="stock-list">
            {lowStock.length > 0 ? lowStock.map((item: any, idx: number) => (
              <div key={item.sku || idx}>
                <span className={`stock-product stock-product--${item.tone}`}><Package size={18} /></span>
                <p><strong>{item.name}</strong><small>{item.sku}</small></p>
                <b>{item.units} unid.</b>
              </div>
            )) : (
              <div style={{ padding: "12px", color: "#778398" }}>
                {productsCount > 0 ? "Todo el stock está bien 👍" : "Sin productos aún."}
              </div>
            )}
          </div>
          <Link href="/app?modulo=inventario" className="panel-link">Ver inventario completo <ChevronRight size={15} /></Link>
        </article>

        <article className="panel-card quick-actions-card">
          <div className="panel-card__heading"><div><h2>Acciones rápidas</h2><p>Lo que más vas a usar</p></div></div>
          <div className="quick-actions">
            <Link href="/app?modulo=ventas"><span className="quick-action--blue"><ShoppingCart size={18} /></span><strong>Nueva venta</strong><small>Registrar una operación</small></Link>
            <Link href="/app?modulo=productos"><span className="quick-action--violet"><Package size={18} /></span><strong>Productos</strong><small>Ver y agregar catálogo</small></Link>
            <Link href="/app?modulo=clientes"><span className="quick-action--cyan"><UserPlus size={18} /></span><strong>Clientes</strong><small>Gestionar compradores</small></Link>
            <Link href="/app?modulo=caja"><span className="quick-action--orange"><WalletCards size={18} /></span><strong>Caja</strong><small>Ingresos y gastos</small></Link>
          </div>
        </article>
      </section>
    </>
  );
}

// ── Página principal ─────────────────────────────────────────────────────────
export default async function ClientDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ modulo?: string }>;
}) {
  const params = await searchParams;
  const modulo = params.modulo || "dashboard";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let orgName = "Tu Negocio";
  let orgId = "";

  try {
    const { data: membership } = await supabase
      .from("memberships")
      .select("organization_id, organizations(name, is_internal)")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    const org = membership?.organizations as any;
    if (org) orgName = org.name || "Tu Negocio";
    orgId = membership?.organization_id || "";
  } catch {}

  const activeKey = modulo === "dashboard" ? "dashboard"
    : modulo === "productos" ? "products"
    : modulo === "inventario" ? "inventory"
    : modulo === "ventas" ? "sales"
    : modulo === "clientes" ? "customers"
    : modulo === "caja" ? "cash"
    : modulo === "categorias" ? "categories"
    : modulo === "proveedores" ? "suppliers"
    : modulo === "reportes" ? "reports"
    : modulo === "configuracion" ? "settings"
    : "dashboard";

  return (
    <DashboardShell mode="client" active={activeKey}>
      {modulo === "dashboard" && (
        <DashboardHome user={user} orgName={orgName} orgId={orgId} supabase={supabase} />
      )}
      {modulo === "productos" && orgId && (
        <ProductosModule orgId={orgId} supabase={supabase} />
      )}
      {modulo === "inventario" && orgId && (
        <InventarioModule orgId={orgId} supabase={supabase} />
      )}
      {modulo === "ventas" && (
        <ComingSoon modulo="Punto de venta" icon={ShoppingCart} desc="Aquí podrás registrar ventas, emitir boletas y ver el historial de operaciones. Estamos construyendo este módulo." />
      )}
      {modulo === "clientes" && (
        <ComingSoon modulo="Clientes" icon={UserPlus} desc="Gestiona tu base de clientes, historial de compras y datos de contacto." />
      )}
      {modulo === "caja" && (
        <ComingSoon modulo="Caja y movimientos" icon={WalletCards} desc="Registra ingresos y gastos, cierra la caja diaria y revisa el balance." />
      )}
      {modulo === "categorias" && (
        <ComingSoon modulo="Categorías y marcas" icon={Wrench} desc="Organiza tu catálogo por categorías y marcas para búsquedas más rápidas." />
      )}
      {modulo === "proveedores" && (
        <ComingSoon modulo="Proveedores" icon={Wrench} desc="Administra tus proveedores, órdenes de compra y costos de abastecimiento." />
      )}
      {modulo === "reportes" && (
        <ComingSoon modulo="Reportes" icon={Wrench} desc="Reportes de ventas, stock, caja y rentabilidad con gráficas detalladas." />
      )}
      {modulo === "configuracion" && (
        <ComingSoon modulo="Configuración" icon={Wrench} desc="Ajusta los datos de tu empresa, usuarios, permisos y preferencias del sistema." />
      )}
    </DashboardShell>
  );
}
