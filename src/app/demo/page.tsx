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
          <h2>Crea tu negocio real en segundos. Tendrás 24 horas completas para probarlo.</h2>
          <p>Se genera una empresa real con productos, stock y movimientos según tu tipo de tienda.</p>
          <ul>
            <li><span><Boxes size={17} /></span><div><strong>Empresa real creada</strong><small>Productos, stock y movimientos según tu rubro.</small></div><Check size={15} /></li>
            <li><span><BarChart3 size={17} /></span><div><strong>Datos reales</strong><small>Todo lo que veas es información de tu negocio.</small></div><Check size={15} /></li>
            <li><span><ShieldCheck size={17} /></span><div><strong>Acceso privado</strong><small>Tu espacio se crea únicamente para ti.</small></div><Check size={15} /></li>
          </ul>
        </div>
        <div className="demo-aside__timer"><Clock3 size={18} /><div><strong>24 horas</strong><small>Prueba completa de tu negocio real</small></div></div>
      </section>
      <section className="auth-content">
        <Link className="auth-back" href="/"><ArrowLeft size={15} /> Volver al inicio</Link>
        <DemoForm />
      </section>
    </main>
  );
}
