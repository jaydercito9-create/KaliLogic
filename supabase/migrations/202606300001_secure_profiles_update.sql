-- Prevent users from promoting themselves through profiles.is_platform_admin.
begin;

drop policy if exists "profiles_update_own" on public.profiles;

-- Table-level UPDATE would override column grants, so revoke it first.
revoke update on table public.profiles from anon, authenticated;
grant update (full_name, phone, avatar_url) on public.profiles to authenticated;

create policy "profiles_update_own"
on public.profiles for update to authenticated
using (id = auth.uid())
with check (id = auth.uid());

-- Platform-admin changes only go through this audited SECURITY DEFINER RPC.
create or replace function public.set_user_platform_admin(
  p_target_user_id uuid,
  p_value boolean
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'Platform admin required' using errcode = '42501';
  end if;

  update public.profiles
  set is_platform_admin = p_value
  where id = p_target_user_id;

  if not found then
    raise exception 'User not found' using errcode = '23503';
  end if;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (
    auth.uid(), 'platform_admin_changed', 'profile', p_target_user_id::text,
    jsonb_build_object('is_platform_admin', p_value)
  );
end;
$$;

revoke all on function public.set_user_platform_admin(uuid, boolean) from public;
grant execute on function public.set_user_platform_admin(uuid, boolean) to authenticated;

commit;
