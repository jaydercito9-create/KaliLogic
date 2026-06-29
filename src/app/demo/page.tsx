import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, BarChart3, Boxes, Check, Clock3, ShieldCheck } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { DemoForm } from "@/components/demo-form";

export const metadata: Metadata = { title: "Prueba KaliLogic gratis" };

export default function DemoPage() {
  return (
    <main className="auth-page demo-page">
      <section className="demo-aside">
        <BrandLogo inverse />
        <div className="demo-aside__copy">
          <span>UNA MEJOR FORMA DE TRABAJAR</span>
          <h2>En 24 horas puedes descubrir cuánto orden le falta a tu negocio.</h2>
          <p>Explora el sistema con información de ejemplo y sin poner en riesgo tus datos reales.</p>
          <ul>
            <li><span><Boxes size={17} /></span><div><strong>Inventario organizado</strong><small>Productos y variantes listos para explorar.</small></div><Check size={15} /></li>
            <li><span><BarChart3 size={17} /></span><div><strong>Reportes comprensibles</strong><small>Mira el rendimiento de tu negocio de un vistazo.</small></div><Check size={15} /></li>
            <li><span><ShieldCheck size={17} /></span><div><strong>Acceso privado</strong><small>Tu espacio se crea únicamente para ti.</small></div><Check size={15} /></li>
          </ul>
        </div>
        <div className="demo-aside__timer"><Clock3 size={18} /><div><strong>24:00:00</strong><small>Comienza con tu primer ingreso</small></div></div>
      </section>
      <section className="auth-content">
        <Link className="auth-back" href="/"><ArrowLeft size={15} /> Volver al inicio</Link>
        <DemoForm />
      </section>
    </main>
  );
}
