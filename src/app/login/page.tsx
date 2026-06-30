"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, ArrowRight, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const supabase = createClient();

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }

    // Check if platform admin -> go to /control, else /app
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("is_platform_admin")
          .eq("id", user.id)
          .single();
        if (prof?.is_platform_admin) {
          router.push("/control");
          return;
        }
      }
    } catch {}

    router.push("/app");
  }

  async function sendMagicLink() {
    if (!email) {
      setError("Ingresa tu correo primero.");
      return;
    }
    setLoading(true);
    setError(null);
    setMessage(null);
    const { error: otpError } = await createClient().auth.signInWithOtp({
      email,
      options: {
        // Legacy token_hash flow (no PKCE)
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/app`,
        shouldCreateUser: false,
      },
    });
    setLoading(false);
    if (otpError) setError("No pudimos enviar el enlace seguro.");
    else setMessage("Revisa tu correo para ingresar sin contraseña.");
  }

  return (
    <main className="login-page">
      <div className="login-page__brand"><BrandLogo /></div>
      <Link className="auth-back login-page__back" href="/"><ArrowLeft size={15} /> Volver al inicio</Link>
      <section className="login-card">
        <div className="login-card__icon"><LockKeyhole size={23} /></div>
        <h1>Bienvenido de nuevo</h1>
        <p>Ingresa para continuar administrando tu negocio.</p>

        <form onSubmit={handleLogin}>
          <label>
            <span>Correo electrónico</span>
            <div className="login-input">
              <Mail size={16} />
              <input
                type="email"
                placeholder="tu@negocio.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </label>

          <label>
            <span>Contraseña</span>
            <div className="login-input">
              <LockKeyhole size={16} />
              <input
                type="password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {message && <p className="text-sm text-green-700">{message}</p>}

          <button
            type="submit"
            className="button button--primary login-submit w-full justify-center"
            disabled={loading}
          >
            {loading ? "Ingresando..." : <>Iniciar sesión <ArrowRight size={16} /></>}
          </button>
          <button type="button" className="button button--secondary w-full justify-center" disabled={loading} onClick={sendMagicLink}>
            Enviarme un enlace seguro
          </button>
        </form>

        <div className="secure-login"><ShieldCheck size={15} /> Acceso protegido por KaliLogic</div>
      </section>

      <p className="login-help">
        ¿Necesitas ayuda? <a href="mailto:soporte@kalilogic.pe">Contactar soporte</a>
      </p>

      <p className="text-xs text-center mt-4 text-[#6d7890]">
        ¿No tienes cuenta? Regístrate primero desde la página de <Link href="/demo">Demo</Link>
      </p>
    </main>
  );
}
