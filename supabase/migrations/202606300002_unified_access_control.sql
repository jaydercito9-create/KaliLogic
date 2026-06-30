-- One database-owned access decision for UI, RLS, RPCs and platform control.
begin;

update public.plans set features = case code
  when 'basic' then '["sales","inventory","cash","customers","reports","settings"]'::jsonb
  when 'premium' then '["sales","inventory","cash","customers","suppliers","purchases","reports","excel_import","settings"]'::jsonb
  when 'plus' then '["sales","inventory","cash","customers","suppliers","purchases","reports","advanced_roles","audit","advanced_reports","settings"]'::jsonb
  else features
end
where code in ('basic', 'premium', 'plus');

create or replace function public.organization_active_plan(target_org uuid)
returns table (
  plan_code text,
  plan_name text,
  features jsonb,
  max_users integer,
  max_branches integer,
  max_skus integer,
  access_expires_at timestamptz,
  access_kind text
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  with eligible as (
    select p.code, p.name, p.features, p.max_users, p.max_branches, p.max_skus,
           s.current_period_end, 'subscription'::text as kind, 1 as priority
    from public.subscriptions s
    join public.organizations o on o.id = s.organization_id and o.status = 'active'
    join public.plans p on p.id = s.plan_id and p.is_active
    where s.organization_id = target_org
      and s.status = 'authorized'
      and (s.current_period_end is null or s.current_period_end > now())

    union all

    select p.code, p.name, p.features, p.max_users, p.max_branches, p.max_skus,
           null, 'internal', 2
    from public.organizations o
    join public.plans p on p.code = 'plus' and p.is_active
    where o.id = target_org and o.is_internal and o.status = 'active'

    union all

    select p.code, p.name, p.features, p.max_users, p.max_branches, p.max_skus,
           t.expires_at, 'trial', 3
    from public.organizations o
    join public.trials t on t.organization_id = o.id
    join public.plans p on p.code = 'basic' and p.is_active
    where o.id = target_org
      and o.status in ('trial', 'active')
      and t.status = 'active'
      and t.expires_at > now()
  )
  select code, name, eligible.features, eligible.max_users, eligible.max_branches,
         eligible.max_skus, current_period_end, kind
  from eligible
  order by priority
  limit 1;
$$;

revoke all on function public.organization_active_plan(uuid) from public;

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
  select p.plan_code, p.plan_name, p.max_users, p.max_branches, p.max_skus
  from public.organization_active_plan(target_org) p;
$$;

create or replace function public.organization_can_write(target_org uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (select 1 from public.organization_active_plan(target_org));
$$;

grant execute on function public.organization_can_write(uuid) to authenticated;

create or replace function public.organization_has_module(target_org uuid, p_module text)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.organization_active_plan(target_org) p
    where p.features ? p_module
  );
$$;

revoke all on function public.organization_has_module(uuid, text) from public;
grant execute on function public.organization_has_module(uuid, text) to authenticated;

drop function public.get_organization_entitlement(uuid);
create function public.get_organization_entitlement(p_organization_id uuid)
returns table (
  state text,
  plan_code text,
  plan_name text,
  expires_at timestamptz,
  features jsonb,
  max_users integer,
  max_branches integer,
  max_skus integer,
  can_write boolean
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  v_org public.organizations%rowtype;
  v_plan record;
begin
  if not public.is_org_member(p_organization_id) and not public.is_platform_admin() then
    raise exception 'Organization access denied' using errcode = '42501';
  end if;

  select * into v_org from public.organizations where id = p_organization_id;
  if not found then
    raise exception 'Organization not found' using errcode = 'P0002';
  end if;

  select * into v_plan from public.organization_active_plan(p_organization_id);
  if found then
    state := case when v_plan.access_kind = 'trial' then 'trial' else 'active' end;
    plan_code := v_plan.plan_code;
    plan_name := v_plan.plan_name;
    expires_at := v_plan.access_expires_at;
    features := v_plan.features;
    max_users := v_plan.max_users;
    max_branches := v_plan.max_branches;
    max_skus := v_plan.max_skus;
    can_write := true;
  else
    select p.code, p.name, s.current_period_end
    into plan_code, plan_name, expires_at
    from public.subscriptions s
    join public.plans p on p.id = s.plan_id
    where s.organization_id = p_organization_id
    order by s.created_at desc
    limit 1;

    if v_org.status in ('suspended', 'cancelled') then
      state := v_org.status::text;
    elsif v_org.status = 'trial' then
      state := 'expired';
      select t.expires_at into expires_at
      from public.trials t where t.organization_id = p_organization_id;
    else
      state := 'unpaid';
    end if;
    features := '[]'::jsonb;
    max_users := null;
    max_branches := null;
    max_skus := null;
    can_write := false;
  end if;

  return next;
end;
$$;

revoke all on function public.get_organization_entitlement(uuid) from public;
grant execute on function public.get_organization_entitlement(uuid) to authenticated;

-- Direct table writes obey the same module decision as the UI and RPCs.
drop policy if exists "memberships_manage_admin" on public.memberships;
create policy "memberships_manage_admin" on public.memberships for all
using (
  public.has_org_role(organization_id, array['owner','admin']::public.membership_role[])
  and public.organization_can_write(organization_id)
)
with check (
  public.has_org_role(organization_id, array['owner','admin']::public.membership_role[])
  and public.organization_can_write(organization_id)
);

drop policy if exists "warehouses_manage_inventory" on public.warehouses;
create policy "warehouses_manage_inventory" on public.warehouses for all
using (
  public.has_org_role(organization_id, array['owner','admin','inventory_manager']::public.membership_role[])
  and public.organization_has_module(organization_id, 'inventory')
)
with check (
  public.has_org_role(organization_id, array['owner','admin','inventory_manager']::public.membership_role[])
  and public.organization_has_module(organization_id, 'inventory')
);

drop policy if exists "products_manage_inventory" on public.products;
create policy "products_manage_inventory" on public.products for all
using (
  public.has_org_role(organization_id, array['owner','admin','inventory_manager']::public.membership_role[])
  and public.organization_has_module(organization_id, 'inventory')
)
with check (
  public.has_org_role(organization_id, array['owner','admin','inventory_manager']::public.membership_role[])
  and public.organization_has_module(organization_id, 'inventory')
);

drop policy if exists "variants_manage_inventory" on public.product_variants;
create policy "variants_manage_inventory" on public.product_variants for all
using (
  public.has_org_role(organization_id, array['owner','admin','inventory_manager']::public.membership_role[])
  and public.organization_has_module(organization_id, 'inventory')
)
with check (
  public.has_org_role(organization_id, array['owner','admin','inventory_manager']::public.membership_role[])
  and public.organization_has_module(organization_id, 'inventory')
);

drop policy if exists "balances_manage_inventory" on public.inventory_balances;
create policy "balances_manage_inventory" on public.inventory_balances for all
using (
  public.has_org_role(organization_id, array['owner','admin','inventory_manager']::public.membership_role[])
  and public.organization_has_module(organization_id, 'inventory')
)
with check (
  public.has_org_role(organization_id, array['owner','admin','inventory_manager']::public.membership_role[])
  and public.organization_has_module(organization_id, 'inventory')
);

drop policy if exists "movements_create_staff" on public.stock_movements;
create policy "movements_create_staff" on public.stock_movements for insert
with check (
  public.has_org_role(organization_id, array['owner','admin','inventory_manager','cashier']::public.membership_role[])
  and public.organization_has_module(organization_id, 'inventory')
);

drop policy if exists "sales_manage_admin" on public.sales;
create policy "sales_manage_admin" on public.sales for update
using (
  public.has_org_role(organization_id, array['owner','admin']::public.membership_role[])
  and public.organization_has_module(organization_id, 'sales')
);

create or replace function public.enforce_sale_module()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if not public.organization_has_module(new.organization_id, 'sales') then
    raise exception 'Sales module is not active' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists sales_enforce_module on public.sales;
create trigger sales_enforce_module before insert on public.sales
for each row execute function public.enforce_sale_module();
revoke all on function public.enforce_sale_module() from public;

-- Small, explicit platform operations; no service-role key in Next.js.
create or replace function public.admin_set_organization_status(
  p_organization_id uuid,
  p_status public.organization_status
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
  update public.organizations set status = p_status where id = p_organization_id;
  if not found then raise exception 'Organization not found' using errcode = 'P0002'; end if;
  insert into public.audit_logs (organization_id, actor_id, action, entity_type, entity_id, metadata)
  values (p_organization_id, auth.uid(), 'organization_status_changed', 'organization', p_organization_id::text, jsonb_build_object('status', p_status));
end;
$$;

create or replace function public.admin_set_plan(
  p_organization_id uuid,
  p_plan_code text,
  p_period_end timestamptz default null
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare v_plan_id uuid;
begin
  if not public.is_platform_admin() then
    raise exception 'Platform admin required' using errcode = '42501';
  end if;
  select id into v_plan_id from public.plans where code = p_plan_code and is_active;
  if v_plan_id is null then raise exception 'Active plan not found' using errcode = 'P0002'; end if;

  update public.subscriptions
  set status = 'cancelled'
  where organization_id = p_organization_id and status in ('pending','authorized','paused','past_due');

  insert into public.subscriptions (
    organization_id, plan_id, provider, billing_cycle, status,
    current_period_start, current_period_end, next_payment_at
  ) values (
    p_organization_id, v_plan_id, 'manual', 'monthly', 'authorized',
    now(), coalesce(p_period_end, now() + interval '30 days'), coalesce(p_period_end, now() + interval '30 days')
  );

  update public.organizations set status = 'active' where id = p_organization_id;
  if not found then raise exception 'Organization not found' using errcode = 'P0002'; end if;
  update public.trials set status = 'converted', converted_at = now() where organization_id = p_organization_id;
  insert into public.audit_logs (organization_id, actor_id, action, entity_type, entity_id, metadata)
  values (p_organization_id, auth.uid(), 'plan_changed', 'organization', p_organization_id::text, jsonb_build_object('plan_code', p_plan_code));
end;
$$;

create or replace function public.admin_extend_trial(
  p_organization_id uuid,
  p_expires_at timestamptz
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
  if p_expires_at <= now() then
    raise exception 'Trial expiration must be in the future' using errcode = '22023';
  end if;
  if not exists (select 1 from public.organizations where id = p_organization_id) then
    raise exception 'Organization not found' using errcode = 'P0002';
  end if;

  insert into public.trials (organization_id, status, started_at, expires_at)
  values (p_organization_id, 'active', now(), p_expires_at)
  on conflict (organization_id) do update
  set status = 'active', started_at = coalesce(public.trials.started_at, now()),
      expires_at = excluded.expires_at, converted_at = null;
  update public.organizations set status = 'trial' where id = p_organization_id;
  insert into public.audit_logs (organization_id, actor_id, action, entity_type, entity_id, metadata)
  values (p_organization_id, auth.uid(), 'trial_extended', 'organization', p_organization_id::text, jsonb_build_object('expires_at', p_expires_at));
end;
$$;

revoke all on function public.admin_set_organization_status(uuid, public.organization_status) from public;
revoke all on function public.admin_set_plan(uuid, text, timestamptz) from public;
revoke all on function public.admin_extend_trial(uuid, timestamptz) from public;
grant execute on function public.admin_set_organization_status(uuid, public.organization_status) to authenticated;
grant execute on function public.admin_set_plan(uuid, text, timestamptz) to authenticated;
grant execute on function public.admin_extend_trial(uuid, timestamptz) to authenticated;

create or replace function public.admin_list_organizations()
returns table (
  id uuid,
  name text,
  business_type text,
  organization_status text,
  access_state text,
  plan_code text,
  plan_name text,
  access_expires_at timestamptz,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'Platform admin required' using errcode = '42501';
  end if;
  return query
  select o.id, o.name, o.business_type, o.status::text, e.state,
         e.plan_code, e.plan_name, e.expires_at, o.created_at
  from public.organizations o
  cross join lateral public.get_organization_entitlement(o.id) e
  where not o.is_internal
  order by o.created_at desc;
end;
$$;

revoke all on function public.admin_list_organizations() from public;
grant execute on function public.admin_list_organizations() to authenticated;

notify pgrst, 'reload schema';
commit;
