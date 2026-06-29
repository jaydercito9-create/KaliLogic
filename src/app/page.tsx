import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Boxes,
  Check,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  PackageCheck,
  ScanBarcode,
  ShieldCheck,
  Shirt,
  ShoppingBag,
  Sparkles,
  Store,
  Users,
  Warehouse,
  Wrench,
} from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";

const features = [
  {
    icon: Boxes,
    title: "Inventario que sí entiendes",
    description: "Stock, variantes, movimientos y alertas ordenados en una sola vista.",
    accent: "blue",
  },
  {
    icon: CircleDollarSign,
    title: "Ventas y caja conectadas",
    description: "Cada venta descuenta existencias y deja tu caja actualizada al instante.",
    accent: "violet",
  },
  {
    icon: BarChart3,
    title: "Decisiones con números",
    description: "Conoce lo que vendes, lo que ganas y qué productos necesitan atención.",
    accent: "cyan",
  },
  {
    icon: Users,
    title: "Tu equipo, con control",
    description: "Asigna accesos por función sin compartir contraseñas ni perder trazabilidad.",
    accent: "orange",
  },
];

const businessTypes = [
  { icon: Shirt, label: "Ropa y moda", note: "Tallas, colores y colecciones" },
  { icon: ShoppingBag, label: "Calzado", note: "Modelos, tallas y marcas" },
  { icon: Store, label: "Bodegas y bazares", note: "Venta ágil y stock diario" },
  { icon: Wrench, label: "Ferreterías", note: "Unidades, marcas y ubicaciones" },
];

const plans = [
  {
    name: "Básico",
    price: "49",
    description: "Para empezar a ordenar tu negocio.",
    features: ["1 sucursal", "2 usuarios", "Hasta 2,500 SKU", "Inventario y ventas", "Reportes básicos"],
  },
  {
    name: "Premium",
    price: "99",
    description: "Para negocios que ya están creciendo.",
    featured: true,
    features: ["2 sucursales", "5 usuarios", "Hasta 15,000 SKU", "Compras y proveedores", "Importación desde Excel"],
  },
  {
    name: "Plus",
    price: "179",
    description: "Más control para equipos consolidados.",
    features: ["5 sucursales", "15 usuarios", "Hasta 50,000 SKU", "Roles avanzados", "Reportes completos"],
  },
];

export default function MarketingPage() {
  return (
    <main className="marketing-page">
      <header className="marketing-nav">
        <div className="container marketing-nav__inner">
          <BrandLogo />
          <nav className="marketing-nav__links" aria-label="Navegación principal">
            <a href="#funciones">Funciones</a>
            <a href="#negocios">Para quién es</a>
            <a href="#planes">Planes</a>
            <a href="#preguntas">Preguntas</a>
          </nav>
          <div className="marketing-nav__actions">
            <Link className="button button--ghost login-link" href="/login">
              Iniciar sesión
            </Link>
            <Link className="button button--primary nav-demo" href="/demo">
              Probar gratis <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </header>

      <section className="hero">
        <div className="hero__glow hero__glow--one" />
        <div className="hero__glow hero__glow--two" />
        <div className="container hero__content">
          <div className="hero__copy">
            <span className="eyebrow"><span className="eyebrow__dot" /> Hecho para negocios que quieren crecer</span>
            <h1>
              Tu negocio claro.<br />
              <span>Tus decisiones, rápidas.</span>
            </h1>
            <p>
              Controla inventario, ventas, caja y gastos desde un sistema simple,
              profesional y listo para acompañarte cada día.
            </p>
            <div className="hero__actions">
              <Link className="button button--primary button--large" href="/demo">
                Probar KaliLogic gratis <ArrowRight size={18} />
              </Link>
              <a className="button button--secondary button--large" href="#funciones">
                Conocer el sistema
              </a>
            </div>
            <div className="hero__trust">
              <span><Check size={15} /> Sin tarjeta</span>
              <span><Check size={15} /> Configuración guiada</span>
              <span><Check size={15} /> Soporte en español</span>
            </div>
          </div>

          <div className="hero-product" aria-label="Vista previa del panel KaliLogic">
            <div className="hero-product__topbar">
              <div className="window-dots"><i /><i /><i /></div>
              <span>tu-proyecto.vercel.app/app</span>
              <div className="hero-product__avatar">LM</div>
            </div>
            <div className="hero-product__body">
              <aside className="preview-sidebar">
                <BrandLogo compact />
                <div className="preview-sidebar__items">
                  <i className="is-active" />
                  <i /><i /><i /><i />
                </div>
              </aside>
              <div className="preview-dashboard">
                <div className="preview-dashboard__heading">
                  <div><small>Buenos días, Lucía</small><strong>Resumen de tu negocio</strong></div>
                  <button>+ Nueva venta</button>
                </div>
                <div className="preview-kpis">
                  <article><span>Ventas de hoy</span><strong>S/ 2,840</strong><small>↗ 18.4%</small></article>
                  <article><span>Utilidad estimada</span><strong>S/ 1,126</strong><small>↗ 12.1%</small></article>
                  <article><span>Productos vendidos</span><strong>86</strong><small>12 ventas</small></article>
                </div>
                <div className="preview-grid">
                  <article className="preview-chart">
                    <div><strong>Ventas semanales</strong><span>Últimos 7 días</span></div>
                    <div className="mini-bars">
                      {[44, 63, 48, 74, 59, 86, 68].map((height, index) => (
                        <i key={index} style={{ height: `${height}%` }} />
                      ))}
                    </div>
                  </article>
                  <article className="preview-alerts">
                    <strong>Stock por atender</strong>
                    <div><span className="product-dot product-dot--blue" /> Polo Essential <b>4</b></div>
                    <div><span className="product-dot product-dot--violet" /> Zapatilla Urban <b>6</b></div>
                    <div><span className="product-dot product-dot--orange" /> Bolso Mini <b>3</b></div>
                  </article>
                </div>
              </div>
            </div>
            <div className="floating-card floating-card--sales">
              <span><PackageCheck size={17} /></span>
              <div><small>Venta registrada</small><strong>S/ 189.90</strong></div>
              <i>Ahora</i>
            </div>
            <div className="floating-card floating-card--stock">
              <span><ScanBarcode size={17} /></span>
              <div><small>Inventario al día</small><strong>1,248 productos</strong></div>
            </div>
          </div>
        </div>
      </section>

      <section className="trust-strip">
        <div className="container trust-strip__inner">
          <p>Todo lo necesario para dejar atrás el cuaderno y las hojas sueltas</p>
          <div>
            <span><ShieldCheck size={18} /> Información protegida</span>
            <span><Clock3 size={18} /> Disponible 24/7</span>
            <span><Warehouse size={18} /> Crece por sucursales</span>
            <span><Sparkles size={18} /> Fácil de aprender</span>
          </div>
        </div>
      </section>

      <section className="features-section" id="funciones">
        <div className="container">
          <div className="section-heading">
            <span className="eyebrow">UN SOLO LUGAR</span>
            <h2>Menos desorden. Más control.</h2>
            <p>Cada módulo trabaja conectado para que no tengas que repetir información ni adivinar cómo va tu negocio.</p>
          </div>
          <div className="feature-grid">
            {features.map(({ icon: Icon, title, description, accent }) => (
              <article className="feature-card" key={title}>
                <span className={`feature-card__icon feature-card__icon--${accent}`}><Icon size={23} /></span>
                <h3>{title}</h3>
                <p>{description}</p>
                <Link href="/demo">Ver cómo funciona <ChevronRight size={15} /></Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="business-section" id="negocios">
        <div className="container business-section__grid">
          <div className="business-section__copy">
            <span className="eyebrow">SE ADAPTA A TU RUBRO</span>
            <h2>Tu negocio tiene su forma de trabajar. KaliLogic la entiende.</h2>
            <p>Usamos la misma base sólida y activamos las herramientas adecuadas para cada tipo de comercio.</p>
            <div className="business-list">
              {businessTypes.map(({ icon: Icon, label, note }) => (
                <div key={label}>
                  <span><Icon size={20} /></span>
                  <p><strong>{label}</strong><small>{note}</small></p>
                  <ChevronRight size={17} />
                </div>
              ))}
            </div>
          </div>
          <div className="business-visual">
            <div className="business-visual__header">
              <div><span className="product-dot product-dot--blue" /> Catálogo de productos</div>
              <button>Agregar producto</button>
            </div>
            <div className="business-visual__filters"><span>Todos</span><span>Ropa</span><span>Calzado</span><i /></div>
            {[
              ["Polo Essential", "Ropa · 6 variantes", "S/ 59.90", "128 unid."],
              ["Zapatilla Urban", "Calzado · 8 variantes", "S/ 149.90", "46 unid."],
              ["Bolso Siena", "Accesorios · 3 variantes", "S/ 89.90", "31 unid."],
              ["Casaca Light", "Ropa · 9 variantes", "S/ 129.90", "18 unid."],
            ].map(([name, category, price, stock], index) => (
              <div className="business-product" key={name}>
                <span className={`business-product__image business-product__image--${index + 1}`}><ShoppingBag size={20} /></span>
                <p><strong>{name}</strong><small>{category}</small></p>
                <b>{price}</b>
                <span>{stock}</span>
              </div>
            ))}
            <div className="business-visual__note"><Sparkles size={16} /> Variantes organizadas por talla y color</div>
          </div>
        </div>
      </section>

      <section className="pricing-section" id="planes">
        <div className="container">
          <div className="section-heading">
            <span className="eyebrow">PLANES TRANSPARENTES</span>
            <h2>Empieza simple. Crece cuando lo necesites.</h2>
            <p>Todos los planes incluyen actualizaciones, seguridad y acompañamiento para comenzar.</p>
          </div>
          <div className="pricing-grid">
            {plans.map((plan) => (
              <article className={plan.featured ? "price-card price-card--featured" : "price-card"} key={plan.name}>
                {plan.featured && <span className="price-card__badge">MÁS ELEGIDO</span>}
                <h3>{plan.name}</h3>
                <p>{plan.description}</p>
                <div className="price"><small>S/</small><strong>{plan.price}</strong><span>/mes</span></div>
                <Link className={plan.featured ? "button button--primary" : "button button--secondary"} href="/demo">
                  Comenzar prueba
                </Link>
                <ul>
                  {plan.features.map((feature) => <li key={feature}><Check size={15} /> {feature}</li>)}
                </ul>
              </article>
            ))}
            <article className="enterprise-card">
              <div><span className="eyebrow">ENTERPRISE</span><h3>¿Necesitas algo a tu medida?</h3></div>
              <p>Dominio propio, más sucursales, integraciones o una solución personalizada para tu operación.</p>
              <a className="button button--secondary" href="https://wa.me/51" target="_blank" rel="noreferrer">
                Conversar con KaliLogic <ArrowRight size={16} />
              </a>
            </article>
          </div>
        </div>
      </section>

      <section className="faq-section" id="preguntas">
        <div className="container faq-section__grid">
          <div><span className="eyebrow">PREGUNTAS FRECUENTES</span><h2>Antes de comenzar</h2><p>Respuestas claras, como debe ser el sistema.</p></div>
          <div className="faq-list">
            <details open><summary>¿Necesito instalar algo?</summary><p>No. KaliLogic funciona desde el navegador en una computadora, tablet o celular.</p></details>
            <details><summary>¿Puedo usarlo si tengo más de una tienda?</summary><p>Sí. Los planes superiores permiten administrar varias sucursales y almacenes desde una cuenta.</p></details>
            <details><summary>¿Mis trabajadores tendrán su propio acceso?</summary><p>Sí. Cada persona tendrá un usuario y permisos según su trabajo.</p></details>
            <details><summary>¿Qué ocurre cuando termina mi demo?</summary><p>Tu información queda protegida y puedes continuar eligiendo un plan o solicitando ayuda.</p></details>
          </div>
        </div>
      </section>

      <section className="closing-cta">
        <div className="container closing-cta__inner">
          <div><span>Empieza hoy</span><h2>Tu negocio merece sentirse bajo control.</h2><p>Prueba una experiencia preparada para tu tipo de tienda.</p></div>
          <Link className="button closing-cta__button" href="/demo">Crear mi demo <ArrowRight size={18} /></Link>
        </div>
      </section>

      <footer className="marketing-footer">
        <div className="container marketing-footer__top">
          <div><BrandLogo inverse /><p>Gestión simple para negocios que quieren avanzar.</p></div>
          <div><strong>Producto</strong><a href="#funciones">Funciones</a><a href="#planes">Planes</a><Link href="/demo">Demo</Link></div>
          <div><strong>Compañía</strong><a href="#negocios">Nosotros</a><a href="#preguntas">Preguntas</a><a href="mailto:hola@kalilogic.pe">Contacto</a></div>
          <div><strong>Legal</strong><a href="#">Privacidad</a><a href="#">Términos</a><a href="#">Seguridad</a></div>
        </div>
        <div className="container marketing-footer__bottom"><span>© 2026 KaliLogic. Todos los derechos reservados.</span><span>Hecho con dedicación en Perú 🇵🇪</span></div>
      </footer>
    </main>
  );
}
