"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
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
  LogOut,
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
import { createClient } from "@/lib/supabase/client";
import { NotificacionesBell } from "@/components/notificaciones-bell";

type ShellMode = "client" | "control";

type NavItem = {
  key: string;
  label: string;
  icon: React.FC<{ size?: number }>;
  href: string;
  badge?: string;
};

type DashboardShellProps = {
  mode: ShellMode;
  active?: string;
  orgId?: string;
  entitlement?: { label: string; state: string; detail: string };
  features?: string[];
  children: React.ReactNode;
};

const navFeature: Record<string, string> = {
  sales: "sales",
  products: "inventory",
  inventory: "inventory",
  categories: "inventory",
  customers: "customers",
  suppliers: "suppliers",
  cash: "cash",
  reports: "reports",
  settings: "settings",
};

const clientSections: { label: string; items: NavItem[] }[] = [
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
      { key: "inventory", label: "Inventario", icon: Boxes, href: "/app?modulo=inventario" },
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

const controlSections: { label: string; items: NavItem[] }[] = [
  {
    label: "KALILOGIC",
    items: [
      { key: "platform", label: "Vista general", icon: LayoutDashboard, href: "/control" },
      { key: "companies", label: "Empresas", icon: Building2, href: "/control?modulo=empresas" },
      { key: "demos", label: "Demos y leads", icon: Sparkles, href: "/control?modulo=demos" },
      { key: "subscriptions", label: "Suscripciones", icon: CreditCard, href: "/control?modulo=suscripciones" },
      { key: "payments", label: "Pagos", icon: CircleDollarSign, href: "/control?modulo=pagos" },
      { key: "plans", label: "Planes y cupones", icon: TicketPercent, href: "/control?modulo=planes" },
    ],
  },
  {
    label: "OPERACIÓN",
    items: [
      { key: "support", label: "Soporte", icon: Headphones, href: "/control?modulo=soporte" },
      { key: "finance", label: "Finanzas KaliLogic", icon: ReceiptText, href: "/control?modulo=finanzas" },
      { key: "audit", label: "Registro de actividad", icon: BarChart3, href: "/control?modulo=auditoria" },
      { key: "settings", label: "Configuración", icon: Settings, href: "/control?modulo=configuracion" },
    ],
  },
];

export function DashboardShell({ mode, active = "dashboard", orgId, entitlement, features = [], children }: DashboardShellProps) {
  const [open, setOpen] = useState(false);
  const isControl = mode === "control";
  const sections = isControl
    ? controlSections
    : clientSections
        .map((section) => ({ ...section, items: section.items.filter((item) => !navFeature[item.key] || features.includes(navFeature[item.key])) }))
        .filter((section) => section.items.length);

  const [userName, setUserName] = useState(isControl ? "Admin" : "Usuario");
  const [orgName, setOrgName] = useState(isControl ? "Plataforma KaliLogic" : "Mi Negocio");
  const [avatar, setAvatar] = useState(isControl ? "KA" : "U");

  useEffect(() => {
    const load = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const full = user.user_metadata?.full_name || user.email?.split("@")[0] || (isControl ? "Admin" : "Usuario");
          setUserName(full.split(" ")[0] || full);
          setAvatar(isControl ? "KA" : (full[0] || "U").toUpperCase());
          if (!isControl) {
            setOrgName(user.user_metadata?.company || "Mi Negocio");
          }
        }
      } catch {}
    };
    load();
  }, [isControl]);

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
            <div><small>Mi empresa</small><strong>{orgName}</strong></div>
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
            <div><span>{entitlement?.label ?? "Sin plan"}</span><b>{entitlement?.state ?? "Pendiente"}</b></div>
            <i><em /></i>
            <small>{entitlement?.detail ?? "Completa la activación de tu empresa"}</small>
          </div>
        )}

        <div className="sidebar-profile">
          <span className="sidebar-profile__avatar">{avatar}</span>
          <div><strong>{userName}</strong><small>{isControl ? "Superadministrador" : "Propietario"}</small></div>
          <button
            className="sidebar-logout"
            aria-label="Cerrar sesión"
            onClick={async () => {
              try {
                const supabase = createClient();
                await supabase.auth.signOut();
              } catch {}
              window.location.href = "/login";
            }}
          >
            <LogOut size={15} />
          </button>
        </div>
      </aside>

      {open && <button className="sidebar-overlay" onClick={() => setOpen(false)} aria-label="Cerrar menú" />}

      <div className="dashboard-main">
        <header className="dashboard-topbar">
          <button className="mobile-menu" onClick={() => setOpen(true)} aria-label="Abrir menú"><Menu size={20} /></button>
          <div className="dashboard-search"><Search size={16} /><span>Buscar productos, clientes o acciones...</span><kbd>⌘ K</kbd></div>
          <div className="dashboard-topbar__right">
            {isControl && <span className="environment-badge"><i /> Sistema operativo</span>}
            {orgId ? (
              <NotificacionesBell orgId={orgId} />
            ) : (
              <button className="topbar-icon" aria-label="Notificaciones"><Bell size={18} /></button>
            )}
          </div>
        </header>
        <div className="dashboard-content">{children}</div>
      </div>
    </div>
  );
}
