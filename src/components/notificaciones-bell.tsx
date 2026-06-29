"use client";

import { useState, useEffect } from "react";
import { Bell, AlertTriangle, Package, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

type Alert = {
  product_name: string;
  sku: string;
  quantity: number;
  minimum: number;
};

export function NotificacionesBell({ orgId }: { orgId: string }) {
  const [open, setOpen] = useState(false);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!orgId) return;
    const supabase = createClient();
    supabase
      .from("inventory_balances")
      .select("quantity, minimum_quantity, products(name, sku)")
      .eq("organization_id", orgId)
      .lt("quantity", supabase.rpc ? 1000 : 1000) // workaround: filter client-side
      .limit(50)
      .then(({ data }: { data: any }) => {
        const low = (data || [])
          .filter((b: any) => b.products && Number(b.quantity) <= Number(b.minimum_quantity || 5))
          .map((b: any) => ({
            product_name: (b.products as any).name,
            sku: (b.products as any).sku,
            quantity: Number(b.quantity),
            minimum: Number(b.minimum_quantity || 5),
          }));
        setAlerts(low);
        setLoaded(true);
      });
  }, [orgId]);

  const count = alerts.length;

  return (
    <div className="notif-wrap">
      <button
        className="topbar-icon"
        aria-label="Notificaciones"
        onClick={() => setOpen((o) => !o)}
      >
        <Bell size={18} />
        {count > 0 && <i className="notif-badge">{count > 9 ? "9+" : count}</i>}
      </button>

      {open && (
        <>
          <button className="notif-overlay" onClick={() => setOpen(false)} aria-label="Cerrar" />
          <div className="notif-dropdown">
            <div className="notif-dropdown__header">
              <strong>Notificaciones</strong>
              <button onClick={() => setOpen(false)}><X size={14} /></button>
            </div>

            {!loaded ? (
              <p className="notif-empty">Cargando...</p>
            ) : count === 0 ? (
              <p className="notif-empty">Sin alertas. Todo el stock está bien 👍</p>
            ) : (
              <>
                <p className="notif-subtitle">{count} producto{count > 1 ? "s" : ""} con stock bajo el mínimo</p>
                <div className="notif-list">
                  {alerts.map((a, i) => (
                    <div key={i} className="notif-item">
                      <span className="notif-item__icon"><AlertTriangle size={15} /></span>
                      <div>
                        <strong>{a.product_name}</strong>
                        <small>{a.sku} · Stock: {a.quantity} (mín. {a.minimum})</small>
                      </div>
                    </div>
                  ))}
                </div>
                <Link href="/app?modulo=inventario" className="notif-cta" onClick={() => setOpen(false)}>
                  Ver inventario completo →
                </Link>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
