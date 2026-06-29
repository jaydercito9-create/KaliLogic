import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "KaliLogic — Tu negocio bajo control",
    template: "%s | KaliLogic",
  },
  description:
    "Inventario, ventas, caja y reportes para negocios que quieren crecer con claridad.",
  // Cambia esto cuando tengas tu dominio propio
  metadataBase: new URL("https://kalilogic.vercel.app"),
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
