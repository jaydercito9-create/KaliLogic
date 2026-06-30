import type { Metadata } from "next";
import type { ComponentType } from "react";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import Link from "next/link";
import {
  Boxes,
  Check,
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
import { VentasModule } from "@/components/ventas-module";
import { CashModule, CategoriesModule, CustomersModule, InventoryModule as OperationalInventory, ProductsModule as OperationalProducts, ReportsModule, SettingsModule, SuppliersModule } from "@/components/business-modules";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Dashboard | KaliLogic" };

// ── Módulo: Próximamente ─────────────────────────────────────────────────────
function ComingSoon({ modulo, icon: Icon, desc }: { modulo: string; icon: ComponentType<{ size?: number }>; desc: string }) {
  return (
    <div className="coming-soon-panel">
      <span className="coming-soon-panel__icon"><Icon size={32} /></span>
      <h2>{modulo}</h2>
      <p>{desc}</p>
      <Link href="/app" className="button button--secondary">← Volver al dashboard</Link>
    </div>
  );
}

// ── Upgrade Banner (aparece en dashboard cuando el trial vence) ──────────────
function UpgradeBanner() {
  return (
    <div className="upgrade-banner">
      <span className="upgrade-banner__icon">⏰</span>
      <div className="upgrade-banner__text">
        <strong>Tu prueba gratuita ha terminado</strong>
        <p>Elige un plan para seguir usando KaliLogic. Tu información está guardada y segura.</p>
      </div>
      <div className="upgrade-banner__actions">
        <Link href="/billing/basic" className="button button--secondary">Básico S/ 49</Link>
        <Link href="/billing/premium" className="button button--primary">Premium S/ 99</Link>
        <Link href="/billing/plus" className="button button--secondary">Plus S/ 179</Link>
      </div>
    </div>
  );
}

// ── Upgrade Prompt (aparece al intentar entrar a módulos sin acceso) ─────────
function UpgradePrompt() {
  const plans = [
    { code: "basic", name: "Básico", price: "49", description: "Para empezar a ordenar tu negocio.", features: ["1 sucursal", "2 usuarios", "Hasta 2,500 SKU", "Inventario y ventas"] },
    { code: "premium", name: "Premium", price: "99", description: "Para negocios que ya están creciendo.", featured: true, features: ["2 sucursales", "5 usuarios", "Hasta 15,000 SKU", "Compras y proveedores"] },
    { code: "plus", name: "Plus", price: "179", description: "Más control para equipos consolidados.", features: ["5 sucursales", "15 usuarios", "Hasta 50,000 SKU", "Roles avanzados"] },
  ];
  return (
    <div className="upgrade-prompt">
      <div className="upgrade-prompt__header">
        <span className="upgrade-prompt__icon">⏰</span>
        <h2>Tu prueba gratuita ha terminado</h2>
        <p>Elige un plan para seguir usando KaliLogic. Tu información está guardada y segura.</p>
      </div>
      <div className="upgrade-prompt__plans">
        {plans.map((plan) => (
          <article key={plan.code} className={plan.featured ? "upgrade-plan upgrade-plan--featured" : "upgrade-plan"}>
            {plan.featured && <span className="upgrade-plan__badge">MÁS ELEGIDO</span>}
            <h3>{plan.name}</h3>
            <p>{plan.description}</p>
            <div className="upgrade-plan__price">
              <small>S/</small><strong>{plan.price}</strong><span>/mes</span>
            </div>
            <Link href={`/billing/${plan.code}`} className={plan.featured ? "button button--primary" : "button button--secondary"}>
              Contratar {plan.name}
            </Link>
            <ul>{plan.features.map((f) => <li key={f}><Check size={14} /> {f}</li>)}</ul>
          </article>
        ))}
      </div>
      <div className="upgrade-prompt__enterprise">
        <p>¿Necesitas algo a tu medida?</p>
        <a href="https://wa.me/51948097148?text=Hola%2C+vengo+desde+KaliLogic+y+quiero+información+sobre+planes." target="_blank" rel="noreferrer" className="button button--ghost">
          Conversar con KaliLogic
        </a>
      </div>
    </div>
  );
}

// ── Módulo: Productos ────────────────────────────────────────────────────────
type ProductRow = { id: string; name: string; sku: string; sale_price: number | string; category: string | null };

async function ProductosModule({ orgId, supabase }: { orgId: string; supabase: SupabaseClient }) {
  const [{ data: products }, { count }] = await Promise.all([
    supabase.from("products").select("id, name, sku, sale_price, category").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(30),
    supabase.from("products").select("id", { count: "exact", head: true }).eq("organization_id", orgId),
  ]);

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
          <div><h2>Productos recientes</h2><p>{count ?? 0} productos registrados</p></div>
        </div>
        <div className="data-table-wrap">
          <table className="data-table">
            <thead><tr><th>NOMBRE</th><th>SKU</th><th>CATEGORÍA</th><th>PRECIO</th></tr></thead>
            <tbody>
              {(products || []).length > 0 ? (products as ProductRow[]).map((p) => (
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
type InventoryRow = {
  quantity: number;
  minimum_quantity: number;
  products: { name: string; sku: string; category: string | null } | null;
};

async function InventarioModule({ orgId, supabase }: { orgId: string; supabase: SupabaseClient }) {
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
              {(balances || []).length > 0 ? (balances as unknown as InventoryRow[]).map((b, i) => {
                const p = b.products;
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
type LowStockItem = { name: string; sku: string; units: number; tone: string };
type LowStockRow = { product_name: string; sku: string; quantity: number };

async function DashboardHome({ user, orgName, orgId, supabase, canWrite }: { user: User; orgName: string; orgId: string; supabase: SupabaseClient; canWrite: boolean }) {
  let productsCount = 0;
  let lowStock: LowStockItem[] = [];
  let lowStockCount = 0;
  let salesToday = 0;
  let cashToday = 0;

  try {
    const limaDayStart = new Date();
    limaDayStart.setUTCHours(5, 0, 0, 0);
    if (limaDayStart > new Date()) limaDayStart.setUTCDate(limaDayStart.getUTCDate() - 1);
    const [{ count }, { data: sales }, { data: cash }] = await Promise.all([
      supabase.from("products").select("id", { count: "exact", head: true }).eq("organization_id", orgId),
      supabase.from("sales").select("total").eq("organization_id", orgId).eq("status", "completed").gte("created_at", limaDayStart.toISOString()),
      supabase.from("cash_movements").select("movement_type,amount").eq("organization_id", orgId).gte("created_at", limaDayStart.toISOString()),
    ]);
    productsCount = count ?? 0;
    salesToday = (sales ?? []).reduce((sum, row) => sum + Number(row.total), 0);
    cashToday = (cash ?? []).reduce((sum, row) => sum + Number(row.amount) * (row.movement_type === "income" ? 1 : -1), 0);

    if (orgId && productsCount > 0) {
      const [{ data: balances }, { count }] = await Promise.all([
        supabase.from("low_stock_alerts").select("quantity, product_name, sku").eq("organization_id", orgId).order("quantity", { ascending: true }).limit(3),
        supabase.from("low_stock_alerts").select("sku", { count: "exact", head: true }).eq("organization_id", orgId),
      ]);
      lowStockCount = count ?? 0;
      const tones = ["blue", "violet", "orange"];
      lowStock = ((balances ?? []) as LowStockRow[])
        .map((b, i) => ({
          name: b.product_name,
          sku: b.sku,
          units: b.quantity,
          tone: tones[i % 3],
        }));
    }
  } catch {}

  const firstName = user?.user_metadata?.full_name?.split(" ")[0] || "";

  return (
    <>
      {!canWrite && <UpgradeBanner />}
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
          <strong>{lowStockCount}</strong>
          <p>Necesitan atención</p>
        </article>
        <article className="kpi-card">
          <div><span className="kpi-card__icon kpi-card__icon--cyan"><ShoppingCart size={20} /></span><small>Ventas</small></div>
          <strong>S/ {salesToday.toFixed(2)}</strong>
          <p>Hoy</p>
        </article>
        <article className="kpi-card">
          <div><span className="kpi-card__icon kpi-card__icon--orange"><WalletCards size={20} /></span><small>Caja</small></div>
          <strong>S/ {cashToday.toFixed(2)}</strong>
          <p>Movimientos de hoy</p>
        </article>
      </section>

      <section className="dashboard-grid dashboard-grid--main">
        <article className="panel-card stock-card">
          <div className="panel-card__heading">
            <div><h2>Stock por atender</h2><p>Los que tienen menos unidades</p></div>
            <span className="alert-count">{lowStockCount}</span>
          </div>
          <div className="stock-list">
            {lowStock.length > 0 ? lowStock.map((item, idx) => (
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
  searchParams: Promise<{ modulo?: string; saved?: string; error?: string; org?: string; billing?: string }>;
}) {
  const params = await searchParams;
  const modulo = params.modulo || "dashboard";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let orgName = "Tu Negocio";
  let orgId = "";
  let entitlement = { label: "Sin plan", state: "Pendiente", detail: "Completa la activación de tu empresa" };
  let canWrite = false;
  let features: string[] = [];

  try {
    let membershipQuery = supabase
      .from("memberships")
      .select("organization_id, organizations(name, is_internal)")
      .eq("user_id", user.id)
      .eq("is_active", true);
    if (params.org) membershipQuery = membershipQuery.eq("organization_id", params.org);
    const { data: membership } = await membershipQuery.order("created_at", { ascending: true }).limit(1).maybeSingle();

    const org = membership?.organizations as { name?: string; is_internal?: boolean } | null;
    if (org) orgName = org.name || "Tu Negocio";
    orgId = membership?.organization_id || "";

    if (orgId) {
      const { data: access } = await supabase.rpc("get_organization_entitlement", { p_organization_id: orgId }).single();
      const status = access as { state: string; plan_name: string | null; expires_at: string | null; features: unknown; can_write: boolean } | null;
      if (status) {
        canWrite = status.can_write;
        features = Array.isArray(status.features) ? status.features.filter((value): value is string => typeof value === "string") : [];
        const stateLabel = ({ trial: "Trial activo", active: "Pagado", unpaid: "Pago pendiente", suspended: "Suspendido", cancelled: "Cancelado", expired: "Vencido" } as Record<string, string>)[status.state] ?? status.state;
        entitlement = {
          label: status.plan_name ? `${status.state === "trial" ? "Trial" : "Plan"} ${status.plan_name}` : "Sin plan",
          state: stateLabel,
          detail: status.expires_at ? `Válido hasta ${new Intl.DateTimeFormat("es-PE", { dateStyle: "medium" }).format(new Date(status.expires_at))}` : "Acciones críticas bloqueadas",
        };
      }
    }
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

  const requiredFeature = ({
    productos: "inventory",
    inventario: "inventory",
    categorias: "inventory",
    ventas: "sales",
    clientes: "customers",
    caja: "cash",
    proveedores: "suppliers",
    reportes: "reports",
    configuracion: "settings",
  } as Record<string, string>)[modulo];
  const canAccessModule = !requiredFeature || (canWrite && features.includes(requiredFeature));

  return (
    <DashboardShell mode="client" active={activeKey} orgId={orgId} entitlement={entitlement} features={features}>
      {params.saved && <p className="status-pill status-pill--success" style={{ marginBottom: 16 }}>Cambios guardados.</p>}
      {params.billing && <p className="status-pill status-pill--warning" style={{ marginBottom: 16 }}>Estamos confirmando tu pago con Mercado Pago.</p>}
      {params.error && <p className="status-pill status-pill--warning" style={{ marginBottom: 16 }}>{params.error}</p>}
      {modulo === "dashboard" && (
        <DashboardHome user={user} orgName={orgName} orgId={orgId} supabase={supabase} canWrite={canWrite} />
      )}
      {modulo === "productos" && orgId && canAccessModule && (
        <OperationalProducts orgId={orgId} supabase={supabase} />
      )}
      {modulo === "inventario" && orgId && canAccessModule && (
        <OperationalInventory orgId={orgId} supabase={supabase} />
      )}
      {modulo === "ventas" && orgId && canAccessModule && (
        <VentasModule orgId={orgId} />
      )}
      {modulo !== "dashboard" && !canAccessModule && (
        <UpgradePrompt />
      )}
      {modulo === "clientes" && orgId && canAccessModule && <CustomersModule orgId={orgId} supabase={supabase} />}
      {modulo === "caja" && orgId && canAccessModule && <CashModule orgId={orgId} supabase={supabase} />}
      {modulo === "categorias" && orgId && canAccessModule && <CategoriesModule orgId={orgId} supabase={supabase} />}
      {modulo === "proveedores" && orgId && canAccessModule && <SuppliersModule orgId={orgId} supabase={supabase} />}
      {modulo === "reportes" && orgId && canAccessModule && <ReportsModule orgId={orgId} supabase={supabase} />}
      {modulo === "configuracion" && orgId && canAccessModule && <SettingsModule orgId={orgId} supabase={supabase} />}
    </DashboardShell>
  );
}
