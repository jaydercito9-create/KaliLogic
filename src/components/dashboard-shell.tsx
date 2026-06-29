"use client";

import Link from "next/link";
import { useState } from "react";
import {
  BarChart3,
  Bell,
  Boxes,
  Building2,
  ChevronDown,
  CircleDollarSign,
  CreditCard,
  Headphones,
  LayoutDashboard,
  Menu,
  Package,
  ReceiptText,
  Search,
  Settings,
  ShoppingCart,
  Sparkles,
  Store,
  Tags,
  TicketPercent,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";

type ShellMode = "client" | "control";

type DashboardShellProps = {
  mode: ShellMode;
  active?: string;
  children: React.ReactNode;
};

const clientSections = [
  {
    label: "GENERAL",
    items: [
      { key: "dashboard", label: "Dashboard", icon: LayoutDashboard, href: "/app" },
      { key: "sales", label: "Punto de venta", icon: ShoppingCart, href: "/app?modulo=ventas" },
    ],
  },
  {
    label: "GESTIÓN",
    items: [
      { key: "products", label: "Productos", icon: Package, href: "/app?modulo=productos" },
      { key: "inventory", label: "Inventario", icon: Boxes, href: "/app?modulo=inventario", badge: "6" },
      { key: "categories", label: "Categorías y marcas", icon: Tags, href: "/app?modulo=categorias" },
      { key: "customers", label: "Clientes", icon: Users, href: "/app?modulo=clientes" },
      { key: "suppliers", label: "Proveedores", icon: Building2, href: "/app?modulo=proveedores" },
    ],
  },
  {
    label: "CONTROL",
    items: [
      { key: "cash", label: "Caja y movimientos", icon: WalletCards, href: "/app?modulo=caja" },
      { key: "reports", label: "Reportes", icon: BarChart3, href: "/app?modulo=reportes" },
      { key: "settings", label: "Configuración", icon: Settings, href: "/app?modulo=configuracion" },
    ],
  },
];

const controlSections = [
  {
    label: "KALILOGIC",
    items: [
      { key: "platform", label: "Vista general", icon: LayoutDashboard, href: "/control" },
      { key: "companies", label: "Empresas", icon: Building2, href: "/control?modulo=empresas" },
      { key: "demos", label: "Demos y leads", icon: Sparkles, href: "/control?modulo=demos", badge: "12" },
      { key: "subscriptions", label: "Suscripciones", icon: CreditCard, href: "/control?modulo=suscripciones" },
      { key: "payments", label: "Pagos", icon: CircleDollarSign, href: "/control?modulo=pagos" },
      { key: "plans", label: "Planes y cupones", icon: TicketPercent, href: "/control?modulo=planes" },
    ],
  },
  {
    label: "OPERACIÓN",
    items: [
      { key: "support", label: "Soporte", icon: Headphones, href: "/control?modulo=soporte", badge: "3" },
      { key: "finance", label: "Finanzas KaliLogic", icon: ReceiptText, href: "/control?modulo=finanzas" },
      { key: "audit", label: "Registro de actividad", icon: BarChart3, href: "/control?modulo=auditoria" },
      { key: "settings", label: "Configuración", icon: Settings, href: "/control?modulo=configuracion" },
    ],
  },
];

export function DashboardShell({ mode, active = "dashboard", children }: DashboardShellProps) {
  const [open, setOpen] = useState(false);
  const isControl = mode === "control";
  const sections = isControl ? controlSections : clientSections;

  return (
    <div className={`dashboard-shell ${open ? "dashboard-shell--open" : ""}`}>
      <aside className="dashboard-sidebar">
        <div className="dashboard-sidebar__brand">
          <BrandLogo inverse href={isControl ? "/control" : "/app"} />
          <button onClick={() => setOpen(false)} className="sidebar-close" aria-label="Cerrar menú"><X size={19} /></button>
        </div>

        {isControl && (
          <div className="workspace-switcher">
            <span className="workspace-switcher__icon"><Sparkles size={15} /></span>
            <div><small>Administrando</small><strong>Plataforma KaliLogic</strong></div>
            <ChevronDown size={14} />
          </div>
        )}

        {!isControl && (
          <div className="workspace-switcher">
            <span className="workspace-switcher__icon workspace-switcher__icon--store"><Store size={15} /></span>
            <div><small>Mi empresa</small><strong>Moda Aurora</strong></div>
            <ChevronDown size={14} />
          </div>
        )}

        <nav className="dashboard-sidebar__nav" aria-label={isControl ? "Administración KaliLogic" : "Administración del negocio"}>
          {sections.map((section) => (
            <div className="nav-section" key={section.label}>
              <span className="nav-section__label">{section.label}</span>
              {section.items.map(({ key, label, icon: Icon, href, badge }) => (
                <Link
                  key={key}
                  className={active === key ? "nav-item nav-item--active" : "nav-item"}
                  href={href}
                  onClick={() => setOpen(false)}
                >
                  <Icon size={17} />
                  <span>{label}</span>
                  {badge && <b>{badge}</b>}
                </Link>
              ))}
            </div>
          ))}
        </nav>

        {isControl && (
          <Link className={active === "my-store" ? "my-business-card my-business-card--active" : "my-business-card"} href="/control/mi-negocio">
            <span><Store size={17} /></span>
            <div><small>MI PROPIA EMPRESA</small><strong>Administrar mi tienda</strong></div>
          </Link>
        )}

        {!isControl && (
          <div className="plan-usage-card">
            <div><span>Plan Premium</span><b>72%</b></div>
            <i><em /></i>
            <small>3,612 de 5,000 productos</small>
          </div>
        )}

        <div className="sidebar-profile">
          <span className="sidebar-profile__avatar">{isControl ? "KA" : "LM"}</span>
          <div><strong>{isControl ? "Kalil Admin" : "Lucía Mendoza"}</strong><small>{isControl ? "Superadministrador" : "Propietaria"}</small></div>
          <ChevronDown size={14} />
        </div>
      </aside>

      {open && <button className="sidebar-overlay" onClick={() => setOpen(false)} aria-label="Cerrar menú" />}

      <div className="dashboard-main">
        <header className="dashboard-topbar">
          <button className="mobile-menu" onClick={() => setOpen(true)} aria-label="Abrir menú"><Menu size={20} /></button>
          <div className="dashboard-search"><Search size={16} /><span>Buscar productos, clientes o acciones...</span><kbd>⌘ K</kbd></div>
          <div className="dashboard-topbar__right">
            {isControl && <span className="environment-badge"><i /> Sistema operativo</span>}
            {!isControl && <span className="trial-badge"><span>24H</span></span>}
            <button className="topbar-icon" aria-label="Notificaciones"><Bell size={18} /><i /></button>
          </div>
        </header>
        <div className="dashboard-content">{children}</div>
      </div>
    </div>
  );
}
