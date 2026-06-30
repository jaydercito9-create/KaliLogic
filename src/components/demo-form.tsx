"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, LoaderCircle, Mail } from "lucide-react";
import { createDemo } from "@/app/actions/create-demo";
import { createClient } from "@/lib/supabase/client";

export function DemoForm() {
  const [loading, setLoading] = useState(false);
  const [sentEmail, setSentEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const fullName = String(formData.get("name") ?? "");
    const phone = String(formData.get("phone") ?? "");
    const email = String(formData.get("email") ?? "");
    const result = await createDemo({
      full_name: fullName,
      company_name: String(formData.get("company") ?? ""),
      email,
      phone,
      business_type: String(formData.get("businessType") ?? ""),
      accepted_terms: formData.get("terms") === "on",
    });

    if (!result.success) {
      setLoading(false);
      setError(result.error ?? "No se pudo iniciar el demo.");
      return;
    }

    const { error: otpError } = await createClient().auth.signInWithOtp({
      email: result.email as string,
      options: {
        // Legacy token_hash flow (no PKCE)
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/app&provision=demo`,
        shouldCreateUser: true,
        data: { full_name: fullName.trim(), phone: phone.replace(/\D/g, "") },
      },
    });

    setLoading(false);
    if (otpError) {
      setError("La solicitud se guardó, pero no pudimos enviar el enlace. Inténtalo nuevamente.");
      return;
    }
    setSentEmail(result.email as string);
  }

  if (sentEmail) {
    return (
      <div className="demo-success">
        <span className="demo-success__icon"><CheckCircle2 size={30} /></span>
        <span className="eyebrow">VERIFICA TU CORREO</span>
        <h1>Te enviamos un enlace seguro</h1>
        <p>Abre el enlace enviado a <strong>{sentEmail}</strong>. Crearemos tu empresa después de verificar que el correo es tuyo.</p>
        <div className="demo-success__details">
          <div><Mail size={17} /><span><strong>Correo enviado</strong><small>{sentEmail}</small></span></div>
        </div>
        <Link className="button button--secondary" href="/login">Volver al inicio de sesión</Link>
      </div>
    );
  }

  return (
    <form className="demo-form" onSubmit={handleSubmit}>
      <div className="demo-form__heading">
        <span className="eyebrow">REGISTRA TU NEGOCIO</span>
        <h1>Cuéntanos sobre tu negocio</h1>
        <p>Verifica tu correo y tendrás una empresa de prueba durante 24 horas.</p>
      </div>

      <div className="field-grid">
        <label><span>Tu nombre</span><input required name="name" minLength={2} maxLength={100} placeholder="Ej. Lucía Mendoza" /></label>
        <label><span>Nombre del negocio</span><input required name="company" minLength={2} maxLength={120} placeholder="Ej. Moda Aurora" /></label>
        <label><span>Correo empresarial</span><input required type="email" name="email" maxLength={254} placeholder="tu@negocio.com" /></label>
        <label><span>WhatsApp</span><div className="phone-input"><b>+51</b><input required type="tel" name="phone" minLength={9} maxLength={15} placeholder="999 999 999" /></div></label>
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
      </div>

      <label className="terms-check">
        <input required type="checkbox" name="terms" />
        <span>Acepto los términos de uso, la política de privacidad y recibir información relacionada con mi registro.</span>
      </label>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <button className="button button--primary demo-submit" disabled={loading}>
        {loading ? <><LoaderCircle className="spin" size={17} /> Enviando enlace...</> : <>Verificar correo y continuar <ArrowRight size={17} /></>}
      </button>

      <p className="demo-form__login">¿Ya tienes una cuenta? <Link href="/login">Inicia sesión</Link></p>
    </form>
  );
}
