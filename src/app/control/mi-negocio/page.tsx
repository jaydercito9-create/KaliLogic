import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  Boxes,
  CircleDollarSign,
  Package,
  Plus,
  ShoppingCart,
  Store,
  WalletCards,
} from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";

export const metadata: Metadata = { title: "Mi tienda — Control" };

export default function MyBusinessPage() {
  return (
    <DashboardShell mode="control" active="my-store">
      <div className="business-context-bar">
        <Link href="/control"><ArrowLeft size={14} /> Volver a KaliLogic</Link>
        <span><i /> Estás administrando tu empresa: <strong>Mi Tienda Principal</strong></span>
      </div>

      <div className="page-heading">
        <div><span>Mi empresa</span><h1>Operación de mi tienda</h1><p>El mismo control que ofreces a tus clientes, dentro de tu panel principal.</p></div>
        <div className="page-heading__actions"><button className="button button--secondary"><Package size={16} /> Nuevo producto</button><button className="button button--primary"><Plus size={17} /> Nueva venta</button></div>
      </div>

      <section className="kpi-grid">
        <article className="kpi-card"><div><span className="kpi-card__icon kpi-card__icon--blue"><CircleDollarSign size={20} /></span><small>Ventas de hoy</small></div><strong>S/ 1,486.50</strong><p><span className="trend trend--up"><ArrowUpRight size={13} /> 9.8%</span> frente a ayer</p></article>
        <article className="kpi-card"><div><span className="kpi-card__icon kpi-card__icon--violet"><WalletCards size={20} /></span><small>Saldo en caja</small></div><strong>S/ 1,824.20</strong><p><span className="trend trend--up">Caja abierta</span> desde 8:04 a. m.</p></article>
        <article className="kpi-card"><div><span className="kpi-card__icon kpi-card__icon--cyan"><ShoppingCart size={20} /></span><small>Ventas realizadas</small></div><strong>16</strong><p><span className="trend trend--up"><ArrowUpRight size={13} /> 3 más</span> ticket S/ 92.90</p></article>
        <article className="kpi-card"><div><span className="kpi-card__icon kpi-card__icon--orange"><Boxes size={20} /></span><small>Stock bajo</small></div><strong>4 productos</strong><p>Revisa el inventario esta semana</p></article>
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
          <div className="panel-card__heading"><div><h2>Ventas de la semana</h2><p>Ingresos diarios de tu tienda</p></div><select><option>Esta semana</option></select></div>
          <div className="store-bars">
            {[45, 64, 51, 78, 66, 88, 71].map((value, index) => <div key={index}><i style={{ height: `${value}%` }} /><span>{["L", "M", "M", "J", "V", "S", "D"][index]}</span></div>)}
          </div>
        </article>
      </section>

      <section className="panel-card own-store-note">
        <span><Store size={18} /></span><div><strong>Una sola sesión, dos responsabilidades</strong><p>Tu tienda está registrada como una organización interna de KaliLogic. Solo tú puedes verla desde este apartado del superadministrador.</p></div>
      </section>
    </DashboardShell>
  );
}
