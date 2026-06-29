"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Minus,
  Package,
  Plus,
  Search,
  ShoppingCart,
  Trash2,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { processSale, CartItem } from "@/app/actions/create-sale";

type Product = {
  id: string;
  name: string;
  sku: string;
  sale_price: number;
  category: string | null;
};

export function VentasModule({ orgId }: { orgId: string }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("efectivo");
  const [discount, setDiscount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState<{ saleNumber: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("products")
      .select("id, name, sku, sale_price, category")
      .eq("organization_id", orgId)
      .eq("is_active", true)
      .order("name")
      .limit(100)
      .then(({ data }: { data: any }) => {
        setProducts(data || []);
        setLoading(false);
      });
  }, [orgId]);

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase())
  );

  const addToCart = (p: Product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.product_id === p.id);
      if (existing) {
        return prev.map((i) =>
          i.product_id === p.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { product_id: p.id, name: p.name, sku: p.sku, unit_price: p.sale_price, quantity: 1 }];
    });
  };

  const changeQty = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) => (i.product_id === id ? { ...i, quantity: i.quantity + delta } : i))
        .filter((i) => i.quantity > 0)
    );
  };

  const removeItem = (id: string) => setCart((prev) => prev.filter((i) => i.product_id !== id));

  const subtotal = cart.reduce((s, i) => s + i.unit_price * i.quantity, 0);
  const total = Math.max(0, subtotal - discount);

  const handleSale = async () => {
    if (cart.length === 0) return;
    setProcessing(true);
    setError(null);
    const res = await processSale({ org_id: orgId, items: cart, customer_name: customerName, payment_method: paymentMethod, discount });
    setProcessing(false);
    if (res.success) {
      setSuccess({ saleNumber: res.saleNumber as number, total: res.total as number });
      setCart([]);
      setCustomerName("");
      setDiscount(0);
    } else {
      setError(res.error || "Error procesando la venta.");
    }
  };

  if (success) {
    return (
      <div className="coming-soon-panel">
        <span className="coming-soon-panel__icon" style={{ background: "linear-gradient(135deg,#ecfdf5,#d1fae5)", color: "#10b981" }}>
          <CheckCircle2 size={32} />
        </span>
        <h2>¡Venta registrada!</h2>
        <p>Venta N° <strong>{success.saleNumber}</strong> por <strong>S/ {success.total.toFixed(2)}</strong> registrada correctamente.</p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
          <button className="button button--primary" onClick={() => setSuccess(null)}>
            <Plus size={16} /> Nueva venta
          </button>
          <Link href="/app" className="button button--secondary">← Dashboard</Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-heading">
        <div><span>Operaciones</span><h1>Punto de venta</h1><p>Registra ventas rápidamente</p></div>
      </div>

      <div className="pos-layout">
        {/* ── Productos ── */}
        <div className="pos-products">
          <div className="pos-search">
            <Search size={15} />
            <input
              type="text"
              placeholder="Buscar producto o SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {loading ? (
            <div className="pos-loading">Cargando productos...</div>
          ) : filtered.length === 0 ? (
            <div className="pos-loading">{search ? "Sin resultados" : "No hay productos aún."}</div>
          ) : (
            <div className="pos-grid">
              {filtered.map((p) => (
                <button key={p.id} className="pos-product-card" onClick={() => addToCart(p)}>
                  <span className="pos-product-card__icon"><Package size={20} /></span>
                  <strong>{p.name}</strong>
                  <small>{p.sku}</small>
                  <b>S/ {Number(p.sale_price).toFixed(2)}</b>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Carrito ── */}
        <div className="pos-cart">
          <div className="pos-cart__header">
            <ShoppingCart size={17} />
            <span>Carrito ({cart.length})</span>
          </div>

          <div className="pos-cart__items">
            {cart.length === 0 ? (
              <p className="pos-cart__empty">Toca un producto para agregarlo</p>
            ) : cart.map((item) => (
              <div key={item.product_id} className="pos-cart__item">
                <div>
                  <strong>{item.name}</strong>
                  <small>S/ {item.unit_price.toFixed(2)} c/u</small>
                </div>
                <div className="pos-qty">
                  <button onClick={() => changeQty(item.product_id, -1)}><Minus size={12} /></button>
                  <span>{item.quantity}</span>
                  <button onClick={() => changeQty(item.product_id, 1)}><Plus size={12} /></button>
                </div>
                <b>S/ {(item.unit_price * item.quantity).toFixed(2)}</b>
                <button className="pos-remove" onClick={() => removeItem(item.product_id)}><X size={13} /></button>
              </div>
            ))}
          </div>

          <div className="pos-cart__footer">
            <label>
              <span>Cliente (opcional)</span>
              <input placeholder="Nombre del cliente" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
            </label>
            <label>
              <span>Pago</span>
              <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                <option value="efectivo">Efectivo</option>
                <option value="tarjeta">Tarjeta</option>
                <option value="yape">Yape / Plin</option>
                <option value="transferencia">Transferencia</option>
              </select>
            </label>
            <label>
              <span>Descuento (S/)</span>
              <input type="number" min={0} step={0.5} value={discount} onChange={(e) => setDiscount(Number(e.target.value))} />
            </label>

            <div className="pos-totals">
              <span>Subtotal</span><span>S/ {subtotal.toFixed(2)}</span>
              {discount > 0 && <><span>Descuento</span><span>- S/ {discount.toFixed(2)}</span></>}
              <strong>TOTAL</strong><strong>S/ {total.toFixed(2)}</strong>
            </div>

            {error && <p style={{ color: "#ef4444", fontSize: 13 }}>{error}</p>}

            <button
              className="button button--primary pos-submit"
              onClick={handleSale}
              disabled={cart.length === 0 || processing}
            >
              {processing ? <><Loader2 size={16} className="spin" /> Procesando...</> : <>Registrar venta · S/ {total.toFixed(2)}</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
