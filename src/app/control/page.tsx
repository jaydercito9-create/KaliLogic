import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Building2,
  CircleDollarSign,
  Clock3,
  CreditCard,
  Headphones,
  MoreHorizontal,
  Plus,
  Sparkles,
  Store,
  TrendingUp,
  UserRoundPlus,
} from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Control de plataforma" };

export default async function ControlPage() {
  const supabase = await createClient();

  // Carga datos reales
  const { data: leads } = await supabase
    .from("leads")
    .select("id, full_name, company_name, email, business_type, created_at")
    .order("created_at", { ascending: false })
    .limit(8);

  const { data: orgs } = await supabase
    .from("organizations")
    .select("id, name, business_type, status, created_at")
    .order("created_at", { ascending: false })
    .limit(6);

  const realCompanies = (orgs || []).map((o: any, i: number) => ({
    name: o.name,
    owner: "—",
    plan: "Básico",
    status: o.status === "trial" ? "Demo" : "Activa",
    renewal: "—",
    usage: "—",
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
        <span className="own-business-banner__stats"><small>Ventas hoy</small><strong>S/ 1,486.50</strong></span>
        <span className="own-business-banner__action">Abrir mi negocio <ArrowRight size={16} /></span>
      </Link>

      <section className="kpi-grid admin-kpis">
        <article className="kpi-card">
          <div><span className="kpi-card__icon kpi-card__icon--blue"><CircleDollarSign size={20} /></span><small>MRR actual</small></div>
          <strong>S/ 8,472</strong>
          <p><span className="trend trend--up"><ArrowUpRight size={13} /> 12.8%</span> este mes</p>
        </article>
        <article className="kpi-card">
          <div><span className="kpi-card__icon kpi-card__icon--violet"><Building2 size={20} /></span><small>Empresas activas</small></div>
          <strong>86</strong>
          <p><span className="trend trend--up"><ArrowUpRight size={13} /> 7 nuevas</span> 3 suspendidas</p>
        </article>
        <article className="kpi-card">
          <div><span className="kpi-card__icon kpi-card__icon--cyan"><Sparkles size={20} /></span><small>Demos en curso</small></div>
          <strong>12</strong>
          <p><span className="trend trend--up"><ArrowUpRight size={13} /> 31.4%</span> conversión</p>
        </article>
        <article className="kpi-card">
          <div><span className="kpi-card__icon kpi-card__icon--orange"><CreditCard size={20} /></span><small>Pagos por revisar</small></div>
          <strong>2</strong>
          <p><span className="trend trend--down">S/ 248</span> pendientes</p>
        </article>
      </section>

      <section className="dashboard-grid admin-main-grid">
        <article className="panel-card admin-revenue-card">
          <div className="panel-card__heading">
            <div><h2>Ingresos recurrentes</h2><p>Evolución de KaliLogic durante 2026</p></div>
            <select><option>Últimos 6 meses</option></select>
          </div>
          <div className="admin-chart-summary"><div><small>Ingreso acumulado</small><strong>S/ 39,824</strong></div><span className="trend trend--up"><TrendingUp size={13} /> +18.6%</span></div>
          <div className="admin-bar-chart">
            {[42, 53, 49, 68, 76, 91].map((value, index) => (
              <div key={index}><i style={{ height: `${value}%` }}><em /></i><span>{["Ene", "Feb", "Mar", "Abr", "May", "Jun"][index]}</span></div>
            ))}
          </div>
        </article>

        <article className="panel-card conversion-card">
          <div className="panel-card__heading"><div><h2>Conversión de demos</h2><p>Últimos 30 días</p></div><Sparkles size={17} /></div>
          <div className="conversion-score"><strong>31.4%</strong><span className="trend trend--up"><ArrowUpRight size={13} /> 4.2%</span></div>
          <div className="funnel-list">
            <div><span><i className="funnel-dot funnel-dot--blue" /> Demos creados</span><strong>86</strong></div>
            <div><span><i className="funnel-dot funnel-dot--violet" /> Demos completados</span><strong>52</strong></div>
            <div><span><i className="funnel-dot funnel-dot--green" /> Clientes convertidos</span><strong>27</strong></div>
          </div>
          <Link className="panel-link" href="/control?modulo=demos">Ver embudo completo <ArrowRight size={14} /></Link>
        </article>
      </section>

      <section className="dashboard-grid admin-bottom-grid">
        <article className="panel-card companies-card">
          <div className="panel-card__heading"><div><h2>Empresas / Orgs recientes</h2><p>Datos reales de Supabase</p></div><button className="panel-link panel-link--plain">Ver todas <ArrowRight size={14} /></button></div>
          <div className="data-table-wrap">
            <table className="data-table admin-table">
              <thead><tr><th>EMPRESA</th><th>TIPO</th><th>ESTADO</th><th>FECHA</th><th /></tr></thead>
              <tbody>
                {(realCompanies.length ? realCompanies : [{name:"Aún no hay empresas", plan:"—", status:"—", renewal:"—", usage:"—"}]).map((company: any, idx: number) => (
                  <tr key={idx}>
                    <td><strong>{company.name}</strong></td>
                    <td><span className="plan-chip">{company.plan}</span></td>
                    <td><span className={company.status === "Activa" || company.status === "Demo" ? "status-pill status-pill--success" : "status-pill status-pill--warning"}>{company.status}</span></td>
                    <td>{company.renewal || "—"}</td>
                    <td><button className="table-action"><MoreHorizontal size={16} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="panel-card activity-card">
          <div className="panel-card__heading"><div><h2>Leads / Interesados recientes</h2><p>Datos reales de Supabase</p></div><Headphones size={17} /></div>
          <div className="admin-tasks">
            {(leads && leads.length > 0) ? leads.slice(0, 4).map((lead: any) => (
              <div key={lead.id} className="text-sm">
                <strong>{lead.company_name}</strong> — {lead.full_name}<br />
                <small>{lead.email} • {lead.business_type}</small>
              </div>
            )) : (
              <div className="text-sm text-muted">Aún no hay leads. ¡Comparte el formulario de /demo!</div>
            )}
          </div>
        </article>
      </section>
    </DashboardShell>
  );
}
