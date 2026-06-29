# KaliLogic

Plataforma SaaS multiempresa para inventario, ventas, caja y gestión de pequeños y medianos comercios.

## Rutas principales (funcionan ahora)

- `/` → Web pública + formulario de demo
- `/demo` → Solicitud de demo (guarda en Supabase)
- `/login` → Login real con Supabase Auth
- `/app` → Panel del cliente (MVP visual)
- `/control` → Superadministración
- `/control/mi-negocio` → Tu propia tienda (dentro del panel de control)

**Sin dominio propio todavía:** Todo funciona con rutas por path en tu dominio gratis de Vercel:
- `https://tu-proyecto.vercel.app`
- `https://tu-proyecto.vercel.app/app`
- `https://tu-proyecto.vercel.app/control`

## Desarrollo local

```bash
npm install
npm run dev
```

Abre http://localhost:3000

## Variables de entorno

Ya tienes `.env.local`. Las claves importantes:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (anon / publishable)
- `SUPABASE_SERVICE_ROLE_KEY` (solo servidor)

Nunca subas el service role al cliente.

## Estado actual (junio 2026)

- ✅ Schema multiempresa + RLS en Supabase ejecutado
- ✅ Formulario de demo guarda leads reales
- ✅ Login con Supabase Auth funcional
- ✅ Middleware con sesión de Supabase
- ✅ Diseño profesional + responsive
- ✅ Rutas /app y /control listas
- ⏳ Creación automática de organización + datos de ejemplo (próximo)
- ⏳ Timer real de 24h en servidor
- ⏳ Datos dinámicos en los paneles

## Próximos pasos recomendados

1. Probar local: `npm run dev`
2. Crear cuenta de prueba en Supabase Auth o usar el demo
3. Desplegar en Vercel (ver instrucciones abajo)
4. Conectar variables de entorno en Vercel
5. Empezar a hacer el dashboard dinámico (productos, etc)

## Desplegar en Vercel (gratis)

1. Ve a vercel.com → New Project → Importa esta carpeta
2. En Settings → Environment Variables pega exactamente las mismas de tu `.env.local`
3. Deploy
4. Abre tu URL de Vercel y prueba `/app` y `/control`

Cuando compres `kalilogic.pe` activaremos los subdominios reales con el proxy.
