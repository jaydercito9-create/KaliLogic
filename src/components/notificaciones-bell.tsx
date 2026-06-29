"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

type Alert = {
  product_name: string;
  sku: string;
  quantity: number;
  minimum: number;
};

type AlertRow = Omit<Alert, "quantity" | "minimum"> & {
  quantity: number | string;
  minimum: number | string;
};

export function NotificacionesBell({ orgId }: { orgId: string }) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    createClient()
      .from("low_stock_alerts")
      .select("product_name, sku, quantity, minimum")
      .eq("organization_id", orgId)
      .order("quantity", { ascending: true })
      .limit(50)
      .then(({ data }: { data: AlertRow[] | null }) => {
        setAlerts((data ?? []).map((alert) => ({
          ...alert,
          quantity: Number(alert.quantity),
          minimum: Number(alert.minimum),
        })));
        setLoaded(true);
      });
  }, [orgId]);

  const count = alerts.length;

  return (
    <>
      <button
        className="topbar-icon"
        aria-label="Notificaciones"
        popoverTarget="notifications-popover"
      >
        <Bell size={18} />
        {count > 0 && <span className="notif-badge">{count > 9 ? "9+" : count}</span>}
      </button>

      <div id="notifications-popover" className="notif-dropdown" popover="auto" aria-label="Notificaciones">
        <div className="notif-dropdown__header">
          <strong>Notificaciones</strong>
        </div>

        {!loaded ? (
          <p className="notif-empty">Cargando...</p>
        ) : count === 0 ? (
          <p className="notif-empty">Sin alertas. Todo el stock está bien 👍</p>
        ) : (
          <>
            <p className="notif-subtitle">{count} producto{count > 1 ? "s" : ""} con stock bajo el mínimo</p>
            <div className="notif-list">
              {alerts.map((alert) => (
                <div key={alert.sku} className="notif-item">
                  <span className="notif-item__icon"><AlertTriangle size={15} /></span>
                  <div>
                    <strong>{alert.product_name}</strong>
                    <small>{alert.sku} · Stock: {alert.quantity} (mín. {alert.minimum})</small>
                  </div>
                </div>
              ))}
            </div>
            <Link href="/app?modulo=inventario" className="notif-cta">
              Ver inventario completo →
            </Link>
          </>
        )}
      </div>
    </>
  );
}
