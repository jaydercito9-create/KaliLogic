import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  CreditCard,
  Headphones,
  Plus,
  Sparkles,
  Store,
  UserRoundPlus,
} from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { createClient } from "@/lib/supabase/server";
import { manageOrganization } from "@/app/control/actions";

export const metadata: Metadata = { title: "Control de plataforma" };

type Lead = { id: string; full_name: string; company_name: string; email: string; business_type: string; created_at: string };
type Organization = {
  id: string;
  name: string;
  business_type: string;
  organization_status: string;
  access_state: string;
  plan_code: string | null;
  plan_name: string | null;
  access_expires_at: string | null;
  created_at: string;
};
type Plan = { code: string; name: string };

import { redirect } from "next/navigation";

export default async function ControlPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_platform_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_platform_admin) redirect("/app");

  let leads: Lead[] = [];
  let orgs: Organization[] = [];
  let plans: Plan[] = [];
  let leadsCount = 0;
  let orgsCount = 0;
  let subscriptionsCount = 0;
  let mrr = 0;

  try {
    const [recentLeads, recentOrgs, leadTotal, activePlans, subscriptions] = await Promise.all([
      supabase.from("leads").select("id, full_name, company_name, email, business_type, created_at").order("created_at", { ascending: false }).limit(8),
      supabase.rpc("admin_list_organizations"),
      supabase.from("leads").select("id", { count: "exact", head: true }),
      supabase.from("plans").select("code, name").eq("is_active", true).order("monthly_price"),
      supabase.from("subscriptions").select("plans(monthly_price)").eq("status", "authorized"),
    ]);
    leads = (recentLeads.data || []) as Lead[];
    orgs = (recentOrgs.data || []) as Organization[];
    plans = (activePlans.data || []) as Plan[];
    leadsCount = leadTotal.count ?? 0;
    orgsCount = orgs.length;
    subscriptionsCount = subscriptions.data?.length ?? 0;
    mrr = (subscriptions.data ?? []).reduce((sum, row) => sum + Number((row.plans as unknown as { monthly_price?: number } | null)?.monthly_price ?? 0), 0);
  } catch (e) {
    console.error("Error loading /control data (check Supabase env vars in Vercel):", e);
  }

  const statusLabel = { trial: "Trial", active: "Activa", suspended: "Suspendida", cancelled: "Cancelada" } as Record<string, string>;
  const accessLabel = { trial: "Trial activo", active: "Pagado", unpaid: "Impago", suspended: "Suspendido", cancelled: "Cancelado", expired: "Vencido" } as Record<string, string>;
  const suggestedTrialEnd = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

  return (
    <DashboardShell mode="control" active="platform">
      <div className="page-heading admin-heading">
        <div><span>Centro de control</span><h1>Hola, Kalil. Todo marcha bien.</h1><p>Supervisa KaliLogic y entra a tu propia tienda desde el mismo lugar.</p></div>
        <div className="page-heading__actions">
          <a className="button button--secondary" href="https://wa.me/51948097148?text=Hola%2C%20vengo%20desde%20el%20panel%20KaliLogic%20y%20necesito%20soporte." target="_blank" rel="noreferrer"><Headphones size={16} /> Soporte</a>
          <Link className="button button--primary" href="/demo"><Plus size={17} /> Nueva empresa</Link>
        </div>
      </div>

      <Link className="own-business-banner" href="/control/mi-negocio">
        <span className="own-business-banner__icon"><Store size={23} /></span>
        <div><small>TU EMPRESA, EN EL MISMO PANEL</small><strong>Administrar mi tienda</strong><p>Ventas, productos, inventario y caja sin cerrar tu sesión de superadministrador.</p></div>
        <span className="own-business-banner__stats"><small>Ventas</small><strong>—</strong></span>
        <span className="own-business-banner__action">Abrir mi negocio <ArrowRight size={16} /></span>
      </Link>

      <section className="kpi-grid admin-kpis">
        <article className="kpi-card">
          <div><span className="kpi-card__icon kpi-card__icon--blue"><Building2 size={20} /></span><small>Organizaciones</small></div>
          <strong>{orgsCount}</strong>
          <p>Datos reales</p>
        </article>
        <article className="kpi-card">
          <div><span className="kpi-card__icon kpi-card__icon--violet"><UserRoundPlus size={20} /></span><small>Leads / Interesados</small></div>
          <strong>{leadsCount}</strong>
          <p>De /demo</p>
        </article>
        <article className="kpi-card">
          <div><span className="kpi-card__icon kpi-card__icon--cyan"><Sparkles size={20} /></span><small>MRR</small></div>
          <strong>S/ {mrr.toFixed(2)}</strong>
          <p>Ingresos recurrentes</p>
        </article>
        <article className="kpi-card">
          <div><span className="kpi-card__icon kpi-card__icon--orange"><CreditCard size={20} /></span><small>Suscripciones</small></div>
          <strong>{subscriptionsCount}</strong>
          <p>Planes activos</p>
        </article>
      </section>

      <section className="dashboard-grid admin-bottom-grid">
        <article className="panel-card companies-card" id="companies">
          <div className="panel-card__heading"><div><h2>Organizaciones recientes</h2><p>Datos reales de Supabase</p></div></div>
          <div className="data-table-wrap">
            <table className="data-table admin-table">
              <thead><tr><th>EMPRESA</th><th>ESTADO REAL</th><th>PLAN</th><th>CONTROL</th></tr></thead>
              <tbody>
                {orgs.length > 0 ? orgs.slice(0, 20).map((company) => (
                  <tr key={company.id}>
                    <td><strong>{company.name}</strong><br /><small>{company.business_type}</small></td>
                    <td>
                      <span className={company.access_state === "active" || company.access_state === "trial" ? "status-pill status-pill--success" : "status-pill status-pill--warning"}>{accessLabel[company.access_state] ?? company.access_state}</span>
                      <br /><small>Org: {statusLabel[company.organization_status] ?? company.organization_status}</small>
                    </td>
                    <td><span className="plan-chip">{company.plan_name ?? "Sin plan"}</span><br /><small>{company.access_expires_at ? new Intl.DateTimeFormat("es-PE", { dateStyle: "short" }).format(new Date(company.access_expires_at)) : "Sin vencimiento"}</small></td>
                    <td>
                      <form action={manageOrganization} style={{ display: "flex", gap: 6, flexWrap: "wrap", minWidth: 380 }}>
                        <input type="hidden" name="organization_id" value={company.id} />
                        <select name="status" defaultValue={company.organization_status} aria-label={`Estado de ${company.name}`}>
                          <option value="trial">Trial</option><option value="active">Activa</option><option value="suspended">Suspendida</option><option value="cancelled">Cancelada</option>
                        </select>
                        <button className="button button--secondary" name="operation" value="status">Estado</button>
                        <select name="plan_code" defaultValue={company.plan_code ?? "basic"} aria-label={`Plan de ${company.name}`}>
                          {plans.map((plan) => <option key={plan.code} value={plan.code}>{plan.name}</option>)}
                        </select>
                        <button className="button button--secondary" name="operation" value="plan">Plan 30d</button>
                        <input type="date" name="trial_end" defaultValue={suggestedTrialEnd} aria-label={`Fin de trial de ${company.name}`} />
                        <button className="button button--secondary" name="operation" value="trial">Extender</button>
                      </form>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={4} style={{padding: '16px', color: '#778398'}}>Aún no hay organizaciones. Comparte /demo</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </article>

        <article className="panel-card activity-card" id="leads">
          <div className="panel-card__heading"><div><h2>Leads recientes</h2><p>De personas que llenaron /demo</p></div><Headphones size={17} /></div>
          <div className="admin-tasks">
            {leads.length > 0 ? leads.slice(0, 5).map((lead) => (
              <div key={lead.id} className="text-sm" style={{marginBottom: '8px'}}>
                <strong>{lead.company_name}</strong> — {lead.full_name}<br />
                <small>{lead.email} • {lead.business_type}</small>
              </div>
            )) : (
              <div className="text-sm text-muted">Aún no hay leads.</div>
            )}
          </div>
        </article>
      </section>
    </DashboardShell>
  );
}
