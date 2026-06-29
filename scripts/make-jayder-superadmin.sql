-- ============================================
-- COPIA Y PEGA ESTO ENTERO EN SUPABASE SQL EDITOR
-- Convierte a jaydercastillorosales102@gmail.com en Super Administrador
-- y le crea una tienda propia para administrar desde /control
-- ============================================

-- 1. Ponerlo como platform admin
UPDATE public.profiles 
SET is_platform_admin = true, updated_at = now()
WHERE id = (SELECT id FROM auth.users WHERE email = 'jaydercastillorosales102@gmail.com' LIMIT 1);

-- 2. Crear su organización interna (si no existe)
INSERT INTO public.organizations (name, slug, business_type, status, is_internal)
VALUES (
  'KaliLogic - Tienda Propia (Jayder)',
  'kalilogic-tienda-jayder',
  'Otro comercio',
  'active',
  true
)
ON CONFLICT (slug) DO NOTHING;

-- 3. Hacerlo owner de su propia tienda
INSERT INTO public.memberships (organization_id, user_id, role, is_active)
SELECT o.id, u.id, 'owner', true
FROM auth.users u
CROSS JOIN public.organizations o
WHERE u.email = 'jaydercastillorosales102@gmail.com'
  AND o.slug = 'kalilogic-tienda-jayder'
ON CONFLICT DO NOTHING;

-- 4. Trial / estado activo (tienda propia sin límite corto)
INSERT INTO public.trials (organization_id, status, started_at, expires_at)
SELECT o.id, 'active', now(), now() + interval '365 days'
FROM public.organizations o
WHERE o.slug = 'kalilogic-tienda-jayder'
ON CONFLICT DO NOTHING;

-- Verificación
SELECT 
  u.email,
  p.is_platform_admin as es_super_admin,
  o.name as su_tienda,
  o.is_internal as es_interna,
  m.role
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
LEFT JOIN public.memberships m ON m.user_id = u.id
LEFT JOIN public.organizations o ON o.id = m.organization_id
WHERE u.email = 'jaydercastillorosales102@gmail.com';
