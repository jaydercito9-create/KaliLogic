-- Run after migrations; fixture IDs may be replaced with real test users.
begin;

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated"}', true);

do $$
begin
  if has_column_privilege('authenticated', 'public.profiles', 'is_platform_admin', 'UPDATE') then
    raise exception 'SECURITY FAILURE: authenticated can update is_platform_admin';
  end if;
  if not has_column_privilege('authenticated', 'public.profiles', 'full_name', 'UPDATE') then
    raise exception 'SECURITY FAILURE: authenticated cannot update safe profile fields';
  end if;
end $$;

do $$
begin
  update public.profiles
  set is_platform_admin = true
  where id = '10000000-0000-0000-0000-000000000001';
  raise exception 'SECURITY FAILURE: is_platform_admin update succeeded';
exception
  when insufficient_privilege then
    raise notice 'OK - is_platform_admin is protected';
end $$;

update public.profiles
set full_name = 'Nombre de Prueba Actualizado',
    phone = '+51999888777',
    avatar_url = 'https://example.com/avatar.jpg'
where id = '10000000-0000-0000-0000-000000000001';

do $$
declare affected integer;
begin
  update public.profiles
  set full_name = 'Hackeado'
  where id = '10000000-0000-0000-0000-000000000002';
  get diagnostics affected = row_count;
  if affected <> 0 then
    raise exception 'SECURITY FAILURE: another profile was updated';
  end if;
end $$;

rollback;
