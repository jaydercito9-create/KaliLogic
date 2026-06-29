-- =====================================================
-- SQL para convertir a jaydercastillorosales102@gmail.com en Super Admin (platform admin)
-- y prepararlo para administrar todo desde /control
-- =====================================================

-- 1. Asegura que el usuario tenga el flag de super admin
update public.profiles
set is_platform_admin = true,
    updated_at = now()
where id = (
  select id 
  from auth.users 
  where email = 'jaydercastillorosales102@gmail.com'
  limit 1
);

-- 2. (Opcional pero recomendado) Crea una organización interna para su propia tienda
--    para que pueda administrarla desde /control/mi-negocio

insert into public.organizations (name, slug, business_type, status, is_internal)
select 
  'KaliLogic - Tienda del Fundador',
  'kalilogic-tienda-fundador',
  'Otro comercio',
  'active',
  true
where not exists (
  select 1 from public.organizations where slug = 'kalilogic-tienda-fundador'
);

-- 3. Vincularlo como owner de esa organización (si no está ya)

insert into public.memberships (organization_id, user_id, role, is_active)
select 
  o.id,
  u.id,
  'owner',
  true
from auth.users u
cross join public.organizations o
where u.email = 'jaydercastillorosales102@gmail.com'
  and o.slug = 'kalilogic-tienda-fundador'
  and not exists (
    select 1 
    from public.memberships m 
    where m.user_id = u.id and m.organization_id = o.id
  );

-- 4. Asegura que tenga un trial activo si lo necesita (para la tienda propia)

insert into public.trials (organization_id, status, started_at, expires_at)
select 
  o.id,
  'active',
  now(),
  now() + interval '365 days'   -- tienda propia sin vencimiento corto
from public.organizations o
where o.slug = 'kalilogic-tienda-fundador'
  and not exists (
    select 1 from public.trials t where t.organization_id = o.id
  );

-- Verificación rápida
select 
  u.email,
  p.is_platform_admin,
  o.name as org_name,
  o.is_internal,
  m.role
from auth.users u
left join public.profiles p on p.id = u.id
left join public.memberships m on m.user_id = u.id
left join public.organizations o on o.id = m.organization_id
where u.email = 'jaydercastillorosales102@gmail.com';
