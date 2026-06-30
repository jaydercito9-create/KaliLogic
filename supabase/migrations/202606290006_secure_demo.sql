-- Pending demo requests are linked only after the email owner authenticates.

alter table public.leads
  add column request_ip_hash text,
  add column provisioned_at timestamptz;

create index leads_email_created_idx on public.leads (lower(email), created_at desc);
create index leads_ip_created_idx on public.leads (request_ip_hash, created_at desc)
where request_ip_hash is not null;

create or replace function public.submit_demo_request(
  p_full_name text,
  p_company_name text,
  p_email text,
  p_phone text,
  p_business_type text,
  p_request_ip_hash text,
  p_accepted_terms boolean
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_email text := lower(btrim(p_email));
  v_lead_id uuid;
begin
  if p_accepted_terms is not true then
    raise exception 'Terms must be accepted' using errcode = '22023';
  end if;
  if p_full_name is null or p_company_name is null or p_email is null or p_phone is null or p_business_type is null
    or length(btrim(p_full_name)) not between 2 and 100
    or length(btrim(p_company_name)) not between 2 and 120
    or length(v_email) > 254
    or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    or p_phone !~ '^[0-9]{9,15}$'
    or p_business_type not in ('Tienda de ropa', 'Tienda de calzado', 'Bodega o bazar', 'Ferretería', 'Cosmética y belleza', 'Otro comercio')
    or (p_request_ip_hash is not null and p_request_ip_hash !~ '^[0-9a-f]{64}$')
  then
    raise exception 'Invalid demo request' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_email || ':' || coalesce(p_request_ip_hash, ''), 0));
  if p_request_ip_hash is not null then
    perform pg_advisory_xact_lock(hashtextextended(p_request_ip_hash, 1));
  end if;

  if (select count(*) from public.leads where lower(email) = v_email and created_at >= now() - interval '1 hour') >= 3
    or (p_request_ip_hash is not null and (select count(*) from public.leads where request_ip_hash = p_request_ip_hash and created_at >= now() - interval '1 hour') >= 10)
  then
    raise exception 'Demo rate limit exceeded' using errcode = 'P0001';
  end if;

  insert into public.leads (
    full_name, company_name, email, phone, business_type, consented_at, request_ip_hash
  ) values (
    btrim(p_full_name), btrim(p_company_name), v_email, p_phone,
    p_business_type, now(), p_request_ip_hash
  )
  returning id into v_lead_id;

  return v_lead_id;
end;
$$;

revoke all on function public.submit_demo_request(text, text, text, text, text, text, boolean) from public;
grant execute on function public.submit_demo_request(text, text, text, text, text, text, boolean) to anon, authenticated;

create or replace function public.provision_demo_organization()
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text;
  v_existing_org uuid;
  v_lead public.leads%rowtype;
  v_org_id uuid;
  v_warehouse_id uuid;
  v_product_id uuid;
  v_slug text;
  v_product_name text;
  v_sku text;
  v_category text;
  v_sale_price numeric(12,2);
  v_cost_price numeric(12,2);
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  select email into v_email
  from auth.users
  where id = v_user_id and email_confirmed_at is not null;

  if v_email is null then
    raise exception 'Verified email required' using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text, 0));

  select organization_id into v_existing_org
  from public.memberships
  where user_id = v_user_id and is_active
  order by created_at, id
  limit 1;

  if v_existing_org is not null then
    update public.leads
    set organization_id = v_existing_org, provisioned_at = coalesce(provisioned_at, now())
    where id = (
      select id from public.leads
      where lower(email) = lower(v_email) and organization_id is null
      order by created_at desc
      limit 1
    );
    return v_existing_org;
  end if;

  select * into v_lead
  from public.leads
  where lower(email) = lower(v_email)
    and organization_id is null
    and created_at > now() - interval '24 hours'
  order by created_at desc
  limit 1
  for update;

  if not found then
    raise exception 'Pending demo request not found' using errcode = 'P0002';
  end if;

  v_slug := trim(both '-' from regexp_replace(lower(v_lead.company_name), '[^a-z0-9]+', '-', 'g'));
  if v_slug = '' then v_slug := 'negocio'; end if;
  v_slug := left(v_slug, 45) || '-' || left(replace(gen_random_uuid()::text, '-', ''), 8);

  insert into public.organizations (name, slug, business_type, status, is_internal)
  values (v_lead.company_name, v_slug, v_lead.business_type, 'trial', false)
  returning id into v_org_id;

  insert into public.trials (organization_id, status, started_at, expires_at)
  values (v_org_id, 'active', now(), now() + interval '24 hours');

  insert into public.memberships (organization_id, user_id, role, is_active)
  values (v_org_id, v_user_id, 'owner', true);

  insert into public.warehouses (organization_id, name, is_primary)
  values (v_org_id, 'Principal', true)
  returning id into v_warehouse_id;

  if lower(v_lead.business_type) like '%cosm%' then
    select 'Crema Hidratante Facial', 'CRE-HID-001', 'Cremas', 45, 22
    into v_product_name, v_sku, v_category, v_sale_price, v_cost_price;
  elsif lower(v_lead.business_type) like '%ropa%' then
    select 'Polo Essential', 'POL-ESS-001', 'Polos', 59.90, 28
    into v_product_name, v_sku, v_category, v_sale_price, v_cost_price;
  elsif lower(v_lead.business_type) like '%calzado%' then
    select 'Zapatilla Urban', 'ZAP-URB-001', 'Zapatillas', 149.90, 78
    into v_product_name, v_sku, v_category, v_sale_price, v_cost_price;
  elsif lower(v_lead.business_type) like '%bodega%' or lower(v_lead.business_type) like '%bazar%' then
    select 'Arroz 1kg', 'ARR-1KG-001', 'Abarrotes', 8.50, 5.20
    into v_product_name, v_sku, v_category, v_sale_price, v_cost_price;
  elsif lower(v_lead.business_type) like '%ferreter%' then
    select 'Martillo 16 oz', 'MAR-016-001', 'Herramientas', 35, 18
    into v_product_name, v_sku, v_category, v_sale_price, v_cost_price;
  else
    select 'Producto de ejemplo', 'EJ-001', 'General', 25, 12
    into v_product_name, v_sku, v_category, v_sale_price, v_cost_price;
  end if;

  insert into public.products (
    organization_id, name, sku, category, sale_price, cost_price, has_variants
  ) values (
    v_org_id, v_product_name, v_sku, v_category, v_sale_price, v_cost_price, false
  )
  returning id into v_product_id;

  insert into public.inventory_balances (
    organization_id, warehouse_id, product_id, quantity, minimum_quantity
  ) values (v_org_id, v_warehouse_id, v_product_id, 20, 5);

  insert into public.stock_movements (
    organization_id, warehouse_id, product_id, movement_type,
    quantity, notes, created_by
  ) values (
    v_org_id, v_warehouse_id, v_product_id, 'initial',
    20, 'Stock inicial de demo', v_user_id
  );

  update public.leads
  set organization_id = v_org_id, provisioned_at = now()
  where id = v_lead.id;

  return v_org_id;
end;
$$;

revoke all on function public.provision_demo_organization() from public;
grant execute on function public.provision_demo_organization() to authenticated;
