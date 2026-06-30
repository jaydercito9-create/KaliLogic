-- Operational modules: customers, suppliers, cash and RPC-only writes.
begin;

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  document text,
  phone text,
  email text,
  address text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, document)
);

create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  document text,
  phone text,
  email text,
  address text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, document)
);

create table public.cash_movements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  movement_type text not null check (movement_type in ('income', 'expense')),
  amount numeric(12,2) not null check (amount > 0),
  payment_method text not null check (payment_method in ('efectivo','tarjeta','yape','transferencia')),
  description text not null,
  reference_type text,
  reference_id uuid,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index customers_org_idx on public.customers (organization_id, created_at desc) where is_active;
create index suppliers_org_idx on public.suppliers (organization_id, created_at desc) where is_active;
create index cash_movements_org_idx on public.cash_movements (organization_id, created_at desc);

create trigger customers_touch before update on public.customers for each row execute function public.touch_updated_at();
create trigger suppliers_touch before update on public.suppliers for each row execute function public.touch_updated_at();

alter table public.customers enable row level security;
alter table public.suppliers enable row level security;
alter table public.cash_movements enable row level security;
grant select on public.customers, public.suppliers, public.cash_movements to authenticated;

create policy "customers_read_member" on public.customers for select
using (public.is_org_member(organization_id) and public.organization_has_module(organization_id, 'customers'));
create policy "suppliers_read_member" on public.suppliers for select
using (public.is_org_member(organization_id) and public.organization_has_module(organization_id, 'suppliers'));
create policy "cash_read_member" on public.cash_movements for select
using (public.is_org_member(organization_id) and public.organization_has_module(organization_id, 'cash'));

drop policy if exists "warehouses_read_member" on public.warehouses;
create policy "warehouses_read_member" on public.warehouses for select using (public.is_org_member(organization_id) and public.organization_has_module(organization_id, 'inventory'));
drop policy if exists "products_read_member" on public.products;
create policy "products_read_member" on public.products for select using (public.is_org_member(organization_id) and public.organization_has_module(organization_id, 'inventory'));
drop policy if exists "variants_read_member" on public.product_variants;
create policy "variants_read_member" on public.product_variants for select using (public.is_org_member(organization_id) and public.organization_has_module(organization_id, 'inventory'));
drop policy if exists "balances_read_member" on public.inventory_balances;
create policy "balances_read_member" on public.inventory_balances for select using (public.is_org_member(organization_id) and public.organization_has_module(organization_id, 'inventory'));
drop policy if exists "movements_read_member" on public.stock_movements;
create policy "movements_read_member" on public.stock_movements for select using (public.is_org_member(organization_id) and public.organization_has_module(organization_id, 'inventory'));
drop policy if exists "sales_read_member" on public.sales;
create policy "sales_read_member" on public.sales for select using (public.is_org_member(organization_id) and public.organization_has_module(organization_id, 'sales'));
drop policy if exists "sale_items_read_member" on public.sale_items;
create policy "sale_items_read_member" on public.sale_items for select using (public.is_org_member(organization_id) and public.organization_has_module(organization_id, 'sales'));

create or replace function public.assert_module_access(
  p_organization_id uuid,
  p_module text,
  p_roles public.membership_role[]
)
returns void
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
begin
  if auth.uid() is null
    or not public.has_org_role(p_organization_id, p_roles)
    or not public.organization_has_module(p_organization_id, p_module)
  then
    raise exception 'Module access denied' using errcode = '42501';
  end if;
end;
$$;
revoke all on function public.assert_module_access(uuid, text, public.membership_role[]) from public;

create or replace function public.save_product(
  p_organization_id uuid,
  p_name text,
  p_sku text,
  p_sale_price numeric,
  p_cost_price numeric,
  p_category text default null,
  p_brand text default null,
  p_initial_stock numeric default 0,
  p_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare v_id uuid; v_warehouse uuid;
begin
  perform public.assert_module_access(p_organization_id, 'inventory', array['owner','admin','inventory_manager']::public.membership_role[]);
  if length(btrim(p_name)) not between 2 and 120 or length(btrim(p_sku)) not between 1 and 80
    or p_sale_price < 0 or p_cost_price < 0 or p_initial_stock < 0 then
    raise exception 'Invalid product' using errcode = '22023';
  end if;
  if p_id is null then
    insert into public.products (organization_id, name, sku, category, brand, sale_price, cost_price)
    values (p_organization_id, btrim(p_name), upper(btrim(p_sku)), nullif(btrim(p_category), ''), nullif(btrim(p_brand), ''), p_sale_price, p_cost_price)
    returning id into v_id;
    select id into v_warehouse from public.warehouses where organization_id = p_organization_id and is_active order by is_primary desc, created_at limit 1;
    if v_warehouse is null then raise exception 'Active warehouse required' using errcode = '23514'; end if;
    insert into public.inventory_balances (organization_id, warehouse_id, product_id, quantity, minimum_quantity)
    values (p_organization_id, v_warehouse, v_id, p_initial_stock, 0);
    if p_initial_stock > 0 then
      insert into public.stock_movements (organization_id, warehouse_id, product_id, movement_type, quantity, notes, created_by)
      values (p_organization_id, v_warehouse, v_id, 'initial', p_initial_stock, 'Stock inicial', auth.uid());
    end if;
  else
    update public.products set name=btrim(p_name), sku=upper(btrim(p_sku)), category=nullif(btrim(p_category), ''),
      brand=nullif(btrim(p_brand), ''), sale_price=p_sale_price, cost_price=p_cost_price
    where id=p_id and organization_id=p_organization_id and is_active returning id into v_id;
    if v_id is null then raise exception 'Product not found' using errcode = 'P0002'; end if;
  end if;
  return v_id;
end;
$$;

create or replace function public.archive_product(p_organization_id uuid, p_id uuid)
returns void language plpgsql security definer set search_path = pg_catalog, public as $$
begin
  perform public.assert_module_access(p_organization_id, 'inventory', array['owner','admin','inventory_manager']::public.membership_role[]);
  update public.products set is_active=false where id=p_id and organization_id=p_organization_id;
  if not found then raise exception 'Product not found' using errcode = 'P0002'; end if;
end;
$$;

create or replace function public.record_inventory_movement(
  p_organization_id uuid, p_product_id uuid, p_quantity numeric, p_notes text default null
)
returns numeric
language plpgsql security definer set search_path = pg_catalog, public as $$
declare v_balance uuid; v_warehouse uuid; v_current numeric;
begin
  perform public.assert_module_access(p_organization_id, 'inventory', array['owner','admin','inventory_manager']::public.membership_role[]);
  if p_quantity = 0 or p_quantity <> round(p_quantity, 3) then raise exception 'Invalid quantity' using errcode = '22023'; end if;
  if not exists (select 1 from public.products where id=p_product_id and organization_id=p_organization_id and is_active) then raise exception 'Product not found' using errcode = 'P0002'; end if;
  select id into v_warehouse from public.warehouses where organization_id=p_organization_id and is_active order by is_primary desc, created_at limit 1;
  if v_warehouse is null then raise exception 'Active warehouse required' using errcode = '23514'; end if;
  insert into public.inventory_balances (organization_id, warehouse_id, product_id, quantity, minimum_quantity)
  values (p_organization_id, v_warehouse, p_product_id, 0, 0) on conflict do nothing;
  select id, quantity into v_balance, v_current from public.inventory_balances
  where organization_id=p_organization_id and warehouse_id=v_warehouse and product_id=p_product_id and variant_id is null for update;
  if v_balance is null or v_current + p_quantity < 0 then raise exception 'Insufficient stock' using errcode = '23514'; end if;
  update public.inventory_balances set quantity=quantity+p_quantity, updated_at=now() where id=v_balance returning quantity into v_current;
  insert into public.stock_movements (organization_id, warehouse_id, product_id, movement_type, quantity, notes, created_by)
  values (p_organization_id, v_warehouse, p_product_id, 'adjustment', p_quantity, nullif(btrim(p_notes), ''), auth.uid());
  return v_current;
end;
$$;

create or replace function public.save_customer(
  p_organization_id uuid, p_name text, p_document text default null, p_phone text default null,
  p_email text default null, p_address text default null, p_id uuid default null
)
returns uuid language plpgsql security definer set search_path = pg_catalog, public as $$
declare v_id uuid;
begin
  perform public.assert_module_access(p_organization_id, 'customers', array['owner','admin','cashier']::public.membership_role[]);
  if length(btrim(p_name)) not between 2 and 120 then raise exception 'Invalid customer' using errcode = '22023'; end if;
  if p_id is null then
    insert into public.customers (organization_id,name,document,phone,email,address)
    values (p_organization_id,btrim(p_name),nullif(btrim(p_document),''),nullif(btrim(p_phone),''),nullif(lower(btrim(p_email)),''),nullif(btrim(p_address),'')) returning id into v_id;
  else
    update public.customers set name=btrim(p_name),document=nullif(btrim(p_document),''),phone=nullif(btrim(p_phone),''),
      email=nullif(lower(btrim(p_email)),''),address=nullif(btrim(p_address),'')
    where id=p_id and organization_id=p_organization_id and is_active returning id into v_id;
    if v_id is null then raise exception 'Customer not found' using errcode = 'P0002'; end if;
  end if;
  return v_id;
end;
$$;

create or replace function public.archive_customer(p_organization_id uuid, p_id uuid)
returns void language plpgsql security definer set search_path = pg_catalog, public as $$
begin
  perform public.assert_module_access(p_organization_id, 'customers', array['owner','admin','cashier']::public.membership_role[]);
  update public.customers set is_active=false where id=p_id and organization_id=p_organization_id;
end;
$$;

create or replace function public.save_supplier(
  p_organization_id uuid, p_name text, p_document text default null, p_phone text default null,
  p_email text default null, p_address text default null, p_id uuid default null
)
returns uuid language plpgsql security definer set search_path = pg_catalog, public as $$
declare v_id uuid;
begin
  perform public.assert_module_access(p_organization_id, 'suppliers', array['owner','admin','inventory_manager']::public.membership_role[]);
  if length(btrim(p_name)) not between 2 and 120 then raise exception 'Invalid supplier' using errcode = '22023'; end if;
  if p_id is null then
    insert into public.suppliers (organization_id,name,document,phone,email,address)
    values (p_organization_id,btrim(p_name),nullif(btrim(p_document),''),nullif(btrim(p_phone),''),nullif(lower(btrim(p_email)),''),nullif(btrim(p_address),'')) returning id into v_id;
  else
    update public.suppliers set name=btrim(p_name),document=nullif(btrim(p_document),''),phone=nullif(btrim(p_phone),''),
      email=nullif(lower(btrim(p_email)),''),address=nullif(btrim(p_address),'')
    where id=p_id and organization_id=p_organization_id and is_active returning id into v_id;
    if v_id is null then raise exception 'Supplier not found' using errcode = 'P0002'; end if;
  end if;
  return v_id;
end;
$$;

create or replace function public.archive_supplier(p_organization_id uuid, p_id uuid)
returns void language plpgsql security definer set search_path = pg_catalog, public as $$
begin
  perform public.assert_module_access(p_organization_id, 'suppliers', array['owner','admin','inventory_manager']::public.membership_role[]);
  update public.suppliers set is_active=false where id=p_id and organization_id=p_organization_id;
end;
$$;

create or replace function public.record_cash_movement(
  p_organization_id uuid, p_movement_type text, p_amount numeric, p_payment_method text, p_description text
)
returns uuid language plpgsql security definer set search_path = pg_catalog, public as $$
declare v_id uuid;
begin
  perform public.assert_module_access(p_organization_id, 'cash', array['owner','admin','cashier']::public.membership_role[]);
  if p_movement_type not in ('income','expense') or p_amount <= 0 or p_payment_method not in ('efectivo','tarjeta','yape','transferencia')
    or length(btrim(p_description)) not between 2 and 200 then raise exception 'Invalid cash movement' using errcode = '22023'; end if;
  insert into public.cash_movements (organization_id,movement_type,amount,payment_method,description,created_by)
  values (p_organization_id,p_movement_type,p_amount,p_payment_method,btrim(p_description),auth.uid()) returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.update_organization_settings(p_organization_id uuid, p_name text, p_business_type text)
returns void language plpgsql security definer set search_path = pg_catalog, public as $$
begin
  perform public.assert_module_access(p_organization_id, 'settings', array['owner','admin']::public.membership_role[]);
  if length(btrim(p_name)) not between 2 and 120 or length(btrim(p_business_type)) not between 2 and 80 then
    raise exception 'Invalid organization settings' using errcode = '22023';
  end if;
  update public.organizations set name=btrim(p_name), business_type=btrim(p_business_type) where id=p_organization_id;
end;
$$;

create or replace function public.record_sale_in_cash()
returns trigger language plpgsql security definer set search_path = pg_catalog, public as $$
begin
  insert into public.cash_movements (organization_id,movement_type,amount,payment_method,description,reference_type,reference_id,created_by)
  values (new.organization_id,'income',new.total,new.payment_method,'Venta ' || new.sale_number,'sale',new.id,new.created_by);
  return new;
end;
$$;
create trigger sales_record_cash after insert on public.sales for each row execute function public.record_sale_in_cash();

revoke all on function public.save_product(uuid,text,text,numeric,numeric,text,text,numeric,uuid) from public;
revoke all on function public.archive_product(uuid,uuid) from public;
revoke all on function public.record_inventory_movement(uuid,uuid,numeric,text) from public;
revoke all on function public.save_customer(uuid,text,text,text,text,text,uuid) from public;
revoke all on function public.archive_customer(uuid,uuid) from public;
revoke all on function public.save_supplier(uuid,text,text,text,text,text,uuid) from public;
revoke all on function public.archive_supplier(uuid,uuid) from public;
revoke all on function public.record_cash_movement(uuid,text,numeric,text,text) from public;
revoke all on function public.update_organization_settings(uuid,text,text) from public;
revoke all on function public.record_sale_in_cash() from public;
grant execute on function public.save_product(uuid,text,text,numeric,numeric,text,text,numeric,uuid) to authenticated;
grant execute on function public.archive_product(uuid,uuid) to authenticated;
grant execute on function public.record_inventory_movement(uuid,uuid,numeric,text) to authenticated;
grant execute on function public.save_customer(uuid,text,text,text,text,text,uuid) to authenticated;
grant execute on function public.archive_customer(uuid,uuid) to authenticated;
grant execute on function public.save_supplier(uuid,text,text,text,text,text,uuid) to authenticated;
grant execute on function public.archive_supplier(uuid,uuid) to authenticated;
grant execute on function public.record_cash_movement(uuid,text,numeric,text,text) to authenticated;
grant execute on function public.update_organization_settings(uuid,text,text) to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_catalog.pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'organizations'
  ) then
    alter publication supabase_realtime add table public.organizations;
  end if;
end;
$$;

notify pgrst, 'reload schema';
commit;
