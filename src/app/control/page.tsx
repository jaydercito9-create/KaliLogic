import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  Clock3,
  CreditCard,
  Headphones,
  MoreHorizontal,
  Plus,
  Sparkles,
  Store,
  UserRoundPlus,
} from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Control de plataforma" };

type Lead = { id: string; full_name: string; company_name: string; email: string; business_type: string; created_at: string };
type Organization = { id: string; name: string; business_type: string; status: string; created_at: string };

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
  let leadsCount = 0;
  let orgsCount = 0;

  try {
    const [recentLeads, recentOrgs, leadTotal, orgTotal] = await Promise.all([
      supabase.from("leads").select("id, full_name, company_name, email, business_type, created_at").order("created_at", { ascending: false }).limit(8),
      supabase.from("organizations").select("id, name, business_type, status, created_at").eq("is_internal", false).order("created_at", { ascending: false }).limit(6),
      supabase.from("leads").select("id", { count: "exact", head: true }),
      supabase.from("organizations").select("id", { count: "exact", head: true }).eq("is_internal", false),
    ]);
    leads = (recentLeads.data || []) as Lead[];
    orgs = (recentOrgs.data || []) as Organization[];
    leadsCount = leadTotal.count ?? 0;
    orgsCount = orgTotal.count ?? 0;
  } catch (e) {
    console.error("Error loading /control data (check Supabase env vars in Vercel):", e);
  }

  const realCompanies = orgs.map((o) => ({
    name: o.name,
    type: o.business_type,
    status: ({ trial: "Trial", active: "Activa", suspended: "Suspendida", cancelled: "Cancelada" } as Record<string, string>)[o.status] ?? o.status,
  }));

  return (
    <DashboardShell mode="control" active="platform">
      <div className="page-heading admin-heading">
        <div><span>Centro de control</span><h1>Hola, Kalil. Todo marcha bien.</h1><p>Supervisa KaliLogic y entra a tu propia tienda desde el mismo lugar.</p></div>
        <div className="page-heading__actions">
          <button className="button button--secondary"><Clock3 size={16} /> Exportar resumen</button>
          <button className="button button--primary"><Plus size={17} /> Nueva empresa</button>
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
          <div><span className="kpi-card__icon kpi-card__icon--cyan"><Sparkles size={20} /></span><small>Próximamente</small></div>
          <strong>MRR</strong>
          <p>Ingresos recurrentes</p>
        </article>
        <article className="kpi-card">
          <div><span className="kpi-card__icon kpi-card__icon--orange"><CreditCard size={20} /></span><small>Próximamente</small></div>
          <strong>Suscripciones</strong>
          <p>Planes activos</p>
        </article>
      </section>

      <section className="dashboard-grid admin-bottom-grid">
        <article className="panel-card companies-card">
          <div className="panel-card__heading"><div><h2>Organizaciones recientes</h2><p>Datos reales de Supabase</p></div><button className="panel-link panel-link--plain">Ver todas <ArrowRight size={14} /></button></div>
          <div className="data-table-wrap">
            <table className="data-table admin-table">
              <thead><tr><th>EMPRESA</th><th>TIPO</th><th>ESTADO</th><th /></tr></thead>
              <tbody>
                {realCompanies.length > 0 ? realCompanies.map((company, idx) => (
                  <tr key={idx}>
                    <td><strong>{company.name}</strong></td>
                    <td><span className="plan-chip">{company.type}</span></td>
                    <td><span className={company.status === "Activa" || company.status === "Demo" ? "status-pill status-pill--success" : "status-pill status-pill--warning"}>{company.status}</span></td>
                    <td><button className="table-action"><MoreHorizontal size={16} /></button></td>
                  </tr>
                )) : (
                  <tr><td colSpan={4} style={{padding: '16px', color: '#778398'}}>Aún no hay organizaciones. Comparte /demo</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </article>

        <article className="panel-card activity-card">
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
