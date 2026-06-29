"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, CheckCircle2, ImagePlus, LoaderCircle, Mail, Store } from "lucide-react";
import { createDemoLead } from "@/app/actions/create-demo";
import { createClient } from "@/lib/supabase/client";
import { provisionDemoOrganization } from "@/app/actions/provision-demo";

export function DemoForm() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [company, setCompany] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const name = (formData.get("name") as string) || "";
    const companyName = (formData.get("company") as string) || "";
    const email = (formData.get("email") as string) || "";
    const phone = (formData.get("phone") as string) || "";
    const businessType = (formData.get("businessType") as string) || "";

    const supabase = createClient();

    // 1. Guardamos el lead (usando server action con service role)
    const leadResult = await createDemoLead({
      full_name: name,
      company_name: companyName,
      email,
      phone,
      business_type: businessType,
    });

    if (!leadResult.success) {
      setLoading(false);
      setError(leadResult.error || "Error guardando la solicitud");
      return;
    }

    // 2. Creamos la cuenta (puede requerir confirmación de email)
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password: "Demo2026!",
      options: {
        data: {
          full_name: name,
          phone,
        },
      },
    });

    if (signUpError && !signUpError.message.includes("already registered")) {
      console.warn("Sign up note:", signUpError.message);
    }

    // 3. Intentar iniciar sesión con contraseña temporal + crear la organización real
    try {
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email,
        password: "Demo2026!",
      });

      if (!signInErr) {
        // Usuario autenticado → creamos su empresa de demo real
        await provisionDemoOrganization({
          companyName: companyName,
          businessType,
        });
      }
    } catch (e) {
      console.log("Provision skipped (probablemente necesita confirmar email):", e);
    }

    setLoading(false);
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="demo-success">
        <span className="demo-success__icon"><CheckCircle2 size={30} /></span>
        <span className="eyebrow">DEMO REGISTRADA</span>
        <h1>¡Solicitud recibida!</h1>
        <p>
          Creamos tu cuenta y <strong>tu empresa real</strong> en KaliLogic para <strong>{company || "tu negocio"}</strong>.
          Tienes productos de ejemplo según tu rubro y 24 horas de prueba.
        </p>
        <div className="demo-success__details">
          <div><Mail size={17} /><span><strong>Contraseña temporal</strong><small>Demo2026! — cámbiala después</small></span><Check size={15} /></div>
          <div><Store size={17} /><span><strong>Empresa creada</strong><small>Ve a /app después de iniciar sesión</small></span><Check size={15} /></div>
        </div>

        <div className="mt-4 flex flex-col gap-3">
          <Link className="button button--primary" href="/login">
            Iniciar sesión ahora <ArrowRight size={17} />
          </Link>
          <Link className="button button--secondary" href="/app">
            Ir al panel del cliente
          </Link>
        </div>

        <small className="demo-success__note">
          Si el login falla, confirma tu correo en Supabase o desactiva confirmaciones temporalmente en Authentication settings.
        </small>
      </div>
    );
  }

  return (
    <form className="demo-form" onSubmit={handleSubmit}>
      <div className="demo-form__heading">
        <span className="eyebrow">PRUEBA DE 24 HORAS</span>
        <h1>Cuéntanos sobre tu negocio</h1>
        <p>Registraremos tu interés y en breve activaremos tu demo real.</p>
      </div>

      <div className="field-grid">
        <label><span>Tu nombre</span><input required name="name" placeholder="Ej. Lucía Mendoza" /></label>
        <label><span>Nombre del negocio</span><input required name="company" value={company} onChange={(event) => setCompany(event.target.value)} placeholder="Ej. Moda Aurora" /></label>
        <label><span>Correo empresarial</span><input required type="email" name="email" placeholder="tu@negocio.com" /></label>
        <label><span>WhatsApp</span><div className="phone-input"><b>+51</b><input required type="tel" name="phone" placeholder="999 999 999" /></div></label>
        <label className="field-grid__full">
          <span>¿Qué tipo de negocio tienes?</span>
          <select required name="businessType" defaultValue="">
            <option value="" disabled>Selecciona una opción</option>
            <option>Tienda de ropa</option>
            <option>Tienda de calzado</option>
            <option>Bodega o bazar</option>
            <option>Ferretería</option>
            <option>Cosmética y belleza</option>
            <option>Otro comercio</option>
          </select>
        </label>
        <label className="field-grid__full logo-upload">
          <input type="file" accept="image/*" />
          <ImagePlus size={21} />
          <span><strong>Logo del negocio</strong><small>Opcional · PNG o JPG hasta 5 MB</small></span>
          <b>Seleccionar</b>
        </label>
      </div>

      <label className="terms-check">
        <input required type="checkbox" />
        <span>Acepto los <a href="#">términos de uso</a>, la <a href="#">política de privacidad</a> y recibir información relacionada con mi demo.</span>
      </label>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <button className="button button--primary demo-submit" disabled={loading}>
        {loading ? <><LoaderCircle className="spin" size={17} /> Registrando...</> : <>Crear mi demo gratis <ArrowRight size={17} /></>}
      </button>

      <p className="demo-form__login">¿Ya tienes una cuenta? <Link href="/login">Inicia sesión</Link></p>
    </form>
  );
}
