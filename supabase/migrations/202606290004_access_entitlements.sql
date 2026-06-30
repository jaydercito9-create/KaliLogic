-- Security model, real entitlements and minimum plan limits.

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid() and is_platform_admin
  );
$$;

revoke all on function public.is_platform_admin() from public;
grant execute on function public.is_platform_admin() to authenticated;

create policy "profiles_read_platform_admin"
on public.profiles for select
using (public.is_platform_admin());

create policy "organizations_read_platform_admin"
on public.organizations for select
using (public.is_platform_admin());

create policy "memberships_read_platform_admin"
on public.memberships for select
using (public.is_platform_admin());

create policy "subscriptions_read_platform_admin"
on public.subscriptions for select
using (public.is_platform_admin());

create policy "trials_read_platform_admin"
on public.trials for select
using (public.is_platform_admin());

create policy "leads_read_platform_admin"
on public.leads for select
using (public.is_platform_admin());

create policy "audit_read_platform_admin"
on public.audit_logs for select
using (public.is_platform_admin());

create or replace function public.organization_plan_limits(target_org uuid)
returns table (
  plan_code text,
  plan_name text,
  max_users integer,
  max_branches integer,
  max_skus integer
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  with eligible as (
    select p.code, p.name, p.max_users, p.max_branches, p.max_skus, 1 as priority
    from public.subscriptions s
    join public.organizations o on o.id = s.organization_id and o.status not in ('suspended', 'cancelled')
    join public.plans p on p.id = s.plan_id and p.is_active
    where s.organization_id = target_org
      and s.status = 'authorized'
      and (s.current_period_end is null or s.current_period_end > now())

    union all

    select p.code, p.name, p.max_users, p.max_branches, p.max_skus, 2
    from public.organizations o
    join public.plans p on p.code = 'plus' and p.is_active
    where o.id = target_org and o.is_internal and o.status = 'active'

    union all

    select p.code, p.name, p.max_users, p.max_branches, p.max_skus, 3
    from public.organizations o
    join public.trials t on t.organization_id = o.id
    join public.plans p on p.code = 'basic' and p.is_active
    where o.id = target_org
      and o.status in ('trial', 'active')
      and t.status = 'active'
      and t.expires_at > now()
  )
  select code, name, max_users, max_branches, max_skus
  from eligible
  order by priority
  limit 1;
$$;

revoke all on function public.organization_plan_limits(uuid) from public;

create or replace function public.organization_can_write(target_org uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1 from public.organization_plan_limits(target_org)
  );
$$;

revoke all on function public.organization_can_write(uuid) from public;

create or replace function public.get_organization_entitlement(p_organization_id uuid)
returns table (
  state text,
  plan_name text,
  expires_at timestamptz,
  max_users integer,
  max_branches integer,
  max_skus integer
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
begin
  if not public.is_org_member(p_organization_id) and not public.is_platform_admin() then
    raise exception 'Organization access denied' using errcode = '42501';
  end if;

  select
    case
      when exists (
        select 1 from public.organizations
        where id = p_organization_id and is_internal and status = 'active'
      ) then 'paid'
      when exists (
        select 1 from public.subscriptions
        where organization_id = p_organization_id
          and status = 'authorized'
          and (current_period_end is null or current_period_end > now())
      ) then 'paid'
      when exists (
        select 1 from public.trials
        where organization_id = p_organization_id
          and status = 'active'
          and expires_at > now()
      ) then 'trial'
      else coalesce((select status::text from public.organizations where id = p_organization_id), 'expired')
    end,
    limits.plan_name,
    coalesce(
      (select max(current_period_end) from public.subscriptions
       where organization_id = p_organization_id and status = 'authorized'),
      (select expires_at from public.trials where organization_id = p_organization_id)
    ),
    limits.max_users,
    limits.max_branches,
    limits.max_skus
  into state, plan_name, expires_at, max_users, max_branches, max_skus
  from public.organization_plan_limits(p_organization_id) limits;

  if not found then
    select
      case when status in ('suspended', 'cancelled') then status::text else 'expired' end,
      null,
      (select t.expires_at from public.trials t where t.organization_id = p_organization_id),
      null,
      null,
      null
    into state, plan_name, expires_at, max_users, max_branches, max_skus
    from public.organizations
    where id = p_organization_id;
  end if;

  return next;
end;
$$;

revoke all on function public.get_organization_entitlement(uuid) from public;
grant execute on function public.get_organization_entitlement(uuid) to authenticated;

create or replace function public.enforce_product_limit()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare allowed integer;
begin
  if not new.is_active then return new; end if;
  perform pg_advisory_xact_lock(hashtextextended(new.organization_id::text, 1));
  if not public.organization_can_write(new.organization_id) then
    raise exception 'Organization has no active trial or subscription' using errcode = '42501';
  end if;
  -- ponytail: max_skus counts products until product variants are implemented.
  select limits.max_skus into allowed from public.organization_plan_limits(new.organization_id) limits;
  if (select count(*) from public.products where organization_id = new.organization_id and is_active and id <> new.id) >= allowed then
    raise exception 'Product limit reached' using errcode = '23514';
  end if;
  return new;
end;
$$;

create or replace function public.enforce_membership_limit()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare allowed integer;
begin
  if not new.is_active then return new; end if;
  perform pg_advisory_xact_lock(hashtextextended(new.organization_id::text, 2));
  if not public.organization_can_write(new.organization_id) then
    raise exception 'Organization has no active trial or subscription' using errcode = '42501';
  end if;
  select limits.max_users into allowed from public.organization_plan_limits(new.organization_id) limits;
  if (select count(*) from public.memberships where organization_id = new.organization_id and is_active and id <> new.id) >= allowed then
    raise exception 'User limit reached' using errcode = '23514';
  end if;
  return new;
end;
$$;

create or replace function public.enforce_warehouse_limit()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare allowed integer;
begin
  if not new.is_active then return new; end if;
  perform pg_advisory_xact_lock(hashtextextended(new.organization_id::text, 3));
  if not public.organization_can_write(new.organization_id) then
    raise exception 'Organization has no active trial or subscription' using errcode = '42501';
  end if;
  -- ponytail: warehouses are the current branch model; split them when real branches ship.
  select limits.max_branches into allowed from public.organization_plan_limits(new.organization_id) limits;
  if (select count(*) from public.warehouses where organization_id = new.organization_id and is_active and id <> new.id) >= allowed then
    raise exception 'Branch limit reached' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger products_enforce_limit
before insert or update of is_active on public.products
for each row execute function public.enforce_product_limit();

create trigger memberships_enforce_limit
before insert or update of is_active on public.memberships
for each row execute function public.enforce_membership_limit();

create trigger warehouses_enforce_limit
before insert or update of is_active on public.warehouses
for each row execute function public.enforce_warehouse_limit();

revoke all on function public.enforce_product_limit() from public;
revoke all on function public.enforce_membership_limit() from public;
revoke all on function public.enforce_warehouse_limit() from public;
