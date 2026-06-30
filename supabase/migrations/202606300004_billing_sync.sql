-- Mercado Pago checkout registration and idempotent webhook reconciliation.
begin;

create table public.payment_events (
  id bigint generated always as identity primary key,
  provider text not null,
  provider_event_id text not null,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (provider, provider_event_id)
);
alter table public.payment_events enable row level security;

create or replace function public.start_subscription_checkout(
  p_organization_id uuid, p_plan_code text, p_provider_subscription_id text
)
returns uuid language plpgsql security definer set search_path = pg_catalog, public as $$
declare v_plan uuid; v_id uuid;
begin
  if not public.has_org_role(p_organization_id, array['owner','admin']::public.membership_role[]) then
    raise exception 'Organization admin required' using errcode = '42501';
  end if;
  select id into v_plan from public.plans where code=p_plan_code and is_active;
  if v_plan is null or length(p_provider_subscription_id) not between 5 and 120 then raise exception 'Invalid checkout' using errcode = '22023'; end if;
  insert into public.subscriptions (organization_id,plan_id,provider,provider_subscription_id,billing_cycle,status)
  values (p_organization_id,v_plan,'mercadopago',p_provider_subscription_id,'monthly','pending')
  on conflict (provider_subscription_id) do update set plan_id=excluded.plan_id, updated_at=now()
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.start_subscription_checkout(uuid,text,text) from public;
grant execute on function public.start_subscription_checkout(uuid,text,text) to authenticated;

create or replace function public.sync_mercadopago_subscription(
  p_event_id text,
  p_event_type text,
  p_provider_subscription_id text,
  p_external_reference text,
  p_provider_status text,
  p_next_payment_at timestamptz,
  p_payload jsonb default '{}'::jsonb
)
returns void language plpgsql security definer set search_path = pg_catalog, public as $$
declare v_org uuid; v_code text; v_plan uuid; v_status public.subscription_status;
begin
  insert into public.payment_events (provider,provider_event_id,event_type,payload)
  values ('mercadopago',p_event_id,p_event_type,p_payload) on conflict do nothing;
  if not found then return; end if;

  v_org := split_part(p_external_reference, ':', 1)::uuid;
  v_code := split_part(p_external_reference, ':', 2);
  select id into v_plan from public.plans where code=v_code and is_active;
  if v_plan is null or not exists (select 1 from public.organizations where id=v_org) then raise exception 'Invalid external reference' using errcode = '22023'; end if;
  v_status := case
    when p_provider_status = 'authorized' then 'authorized'::public.subscription_status
    when p_provider_status = 'paused' then 'paused'::public.subscription_status
    when p_provider_status in ('cancelled','canceled') then 'cancelled'::public.subscription_status
    when p_provider_status in ('rejected','past_due') then 'past_due'::public.subscription_status
    else 'pending'::public.subscription_status end;

  insert into public.subscriptions (organization_id,plan_id,provider,provider_subscription_id,billing_cycle,status,current_period_start,current_period_end,next_payment_at)
  values (v_org,v_plan,'mercadopago',p_provider_subscription_id,'monthly',v_status,case when v_status='authorized' then now() end,p_next_payment_at,p_next_payment_at)
  on conflict (provider_subscription_id) do update set plan_id=excluded.plan_id,status=excluded.status,
    current_period_start=coalesce(public.subscriptions.current_period_start,excluded.current_period_start),
    current_period_end=excluded.current_period_end,next_payment_at=excluded.next_payment_at,updated_at=now();

  if v_status='authorized' then
    update public.organizations set status='active' where id=v_org;
    update public.trials set status='converted',converted_at=now() where organization_id=v_org and status='active';
  else
    update public.organizations set updated_at=now() where id=v_org;
  end if;
end;
$$;
revoke all on function public.sync_mercadopago_subscription(text,text,text,text,text,timestamptz,jsonb) from public;
grant execute on function public.sync_mercadopago_subscription(text,text,text,text,text,timestamptz,jsonb) to service_role;

create or replace function public.admin_set_provider_plan(p_organization_id uuid, p_plan_code text)
returns void language plpgsql security definer set search_path = pg_catalog, public as $$
declare v_plan uuid;
begin
  if not public.is_platform_admin() then raise exception 'Platform admin required' using errcode = '42501'; end if;
  select id into v_plan from public.plans where code=p_plan_code and is_active;
  if v_plan is null then raise exception 'Plan not found' using errcode = 'P0002'; end if;
  update public.subscriptions set plan_id=v_plan,updated_at=now()
  where id=(select id from public.subscriptions where organization_id=p_organization_id and provider='mercadopago' and status <> 'cancelled' order by created_at desc limit 1);
  if not found then raise exception 'Provider subscription not found' using errcode = 'P0002'; end if;
  update public.organizations set status='active' where id=p_organization_id;
  insert into public.audit_logs (organization_id,actor_id,action,entity_type,entity_id,metadata)
  values (p_organization_id,auth.uid(),'provider_plan_changed','organization',p_organization_id::text,jsonb_build_object('plan_code',p_plan_code));
end;
$$;
revoke all on function public.admin_set_provider_plan(uuid,text) from public;
grant execute on function public.admin_set_provider_plan(uuid,text) to authenticated;

notify pgrst, 'reload schema';
commit;
