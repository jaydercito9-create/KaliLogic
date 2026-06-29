"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, CheckCircle2, ImagePlus, LoaderCircle, Mail, Store } from "lucide-react";
import { createDemo } from "@/app/actions/create-demo";

export function DemoForm() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [company, setCompany] = useState("");
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(event.currentTarget);

    const res = await createDemo({
      full_name: (formData.get("name") as string) || "",
      company_name: (formData.get("company") as string) || "",
      email: (formData.get("email") as string) || "",
      phone: (formData.get("phone") as string) || "",
      business_type: (formData.get("businessType") as string) || "",
    });

    setLoading(false);

    if (res.success) {
      setResult(res);
      setSubmitted(true);
    } else {
      setError(res.error || "Ocurrió un error al crear tu demo. Revisa que todas las variables de entorno estén puestas en Vercel.");
    }
  }

  if (submitted && result) {
    return (
      <div className="demo-success">
        <span className="demo-success__icon"><CheckCircle2 size={30} /></span>
        <span className="eyebrow">EMPRESA CREADA</span>
        <h1>¡Listo! Tu negocio ya existe en KaliLogic</h1>
        <p>
          Se creó <strong>{result.companyName}</strong> con productos reales, stock y movimientos según tu rubro. Tienes 24 horas de prueba completa.
        </p>

        <div className="demo-success__details">
          <div><Mail size={17} /><span><strong>Tu correo</strong><small>{result.email || "el que registraste"}</small></span><Check size={15} /></div>
          <div><strong>Contraseña temporal:</strong> <span className="font-mono bg-gray-100 px-2 rounded">{result.tempPassword}</span></div>
        </div>

        <div className="mt-4 flex flex-col gap-3">
          <Link className="button button--primary" href="/login">
            Iniciar sesión con tu contraseña temporal <ArrowRight size={17} />
          </Link>
          <Link className="button button--secondary" href="/app">
            Ir al panel del cliente (/app)
          </Link>
          <Link className="button button--ghost" href="/control">
            Ir al panel de superadmin (/control)
          </Link>
        </div>

        <small className="demo-success__note">
          Cambia la contraseña después de entrar. Si el login pide confirmación de email, desactiva temporalmente "Confirm email" en Supabase Authentication settings.
        </small>
      </div>
    );
  }

  return (
    <form className="demo-form" onSubmit={handleSubmit}>
      <div className="demo-form__heading">
        <span className="eyebrow">REGISTRA TU NEGOCIO</span>
        <h1>Cuéntanos sobre tu negocio</h1>
        <p>Creamos tu empresa real en segundos. Tendrás 24 horas de prueba completa con datos reales.</p>
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
