-- KaliLogic: base multiempresa inicial
create extension if not exists pgcrypto;

create type public.organization_status as enum ('trial', 'active', 'suspended', 'cancelled');
create type public.membership_role as enum ('owner', 'admin', 'inventory_manager', 'cashier', 'viewer');
create type public.trial_status as enum ('pending', 'active', 'expired', 'converted', 'rejected');
create type public.subscription_status as enum ('pending', 'authorized', 'paused', 'cancelled', 'past_due');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text,
  avatar_url text,
  is_platform_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  business_type text not null,
  logo_url text,
  status public.organization_status not null default 'trial',
  is_internal boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.membership_role not null default 'viewer',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create table public.plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  monthly_price numeric(10,2) not null,
  yearly_price numeric(10,2) not null,
  max_users integer not null,
  max_branches integer not null,
  max_skus integer not null,
  features jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  plan_id uuid not null references public.plans(id),
  provider text not null default 'mercadopago',
  provider_subscription_id text unique,
  billing_cycle text not null check (billing_cycle in ('monthly', 'yearly')),
  status public.subscription_status not null default 'pending',
  current_period_start timestamptz,
  current_period_end timestamptz,
  next_payment_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.trials (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references public.organizations(id) on delete cascade,
  status public.trial_status not null default 'pending',
  started_at timestamptz,
  expires_at timestamptz,
  converted_at timestamptz,
  created_at timestamptz not null default now(),
  constraint valid_trial_range check (expires_at is null or started_at is null or expires_at > started_at)
);

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  company_name text not null,
  email text not null,
  phone text not null,
  business_type text not null,
  logo_url text,
  wants_to_continue boolean,
  organization_id uuid references public.organizations(id) on delete set null,
  consented_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table public.warehouses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  is_primary boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  sku text not null,
  category text,
  brand text,
  description text,
  sale_price numeric(12,2) not null default 0,
  cost_price numeric(12,2) not null default 0,
  has_variants boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, sku)
);

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  sku text not null,
  attributes jsonb not null default '{}'::jsonb,
  sale_price numeric(12,2),
  cost_price numeric(12,2),
  barcode text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (organization_id, sku)
);

create table public.inventory_balances (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  warehouse_id uuid not null references public.warehouses(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  variant_id uuid references public.product_variants(id) on delete cascade,
  quantity numeric(14,3) not null default 0,
  minimum_quantity numeric(14,3) not null default 0,
  updated_at timestamptz not null default now()
);

create table public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  warehouse_id uuid not null references public.warehouses(id),
  product_id uuid not null references public.products(id),
  variant_id uuid references public.product_variants(id),
  movement_type text not null check (movement_type in ('initial', 'purchase', 'sale', 'return', 'adjustment', 'transfer_in', 'transfer_out')),
  quantity numeric(14,3) not null,
  reference_type text,
  reference_id uuid,
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.sales (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  sale_number bigint generated by default as identity,
  customer_name text,
  subtotal numeric(12,2) not null default 0,
  discount numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  payment_method text not null,
  status text not null default 'completed' check (status in ('draft', 'completed', 'cancelled', 'refunded')),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.sale_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  sale_id uuid not null references public.sales(id) on delete cascade,
  product_id uuid not null references public.products(id),
  variant_id uuid references public.product_variants(id),
  quantity numeric(14,3) not null,
  unit_price numeric(12,2) not null,
  total numeric(12,2) not null
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  organization_id uuid references public.organizations(id) on delete set null,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index memberships_user_idx on public.memberships(user_id) where is_active;
create index products_organization_idx on public.products(organization_id);
create index variants_product_idx on public.product_variants(product_id);
create index inventory_organization_idx on public.inventory_balances(organization_id, warehouse_id);
create index movements_organization_created_idx on public.stock_movements(organization_id, created_at desc);
create index sales_organization_created_idx on public.sales(organization_id, created_at desc);
create index trials_expires_idx on public.trials(expires_at) where status = 'active';
create index subscriptions_next_payment_idx on public.subscriptions(next_payment_at) where status = 'authorized';

create or replace function public.is_org_member(target_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.memberships
    where organization_id = target_org and user_id = auth.uid() and is_active
  );
$$;

create or replace function public.has_org_role(target_org uuid, allowed_roles public.membership_role[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.memberships
    where organization_id = target_org
      and user_id = auth.uid()
      and is_active
      and role = any(allowed_roles)
  );
$$;

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();
create trigger organizations_touch before update on public.organizations for each row execute function public.touch_updated_at();
create trigger subscriptions_touch before update on public.subscriptions for each row execute function public.touch_updated_at();
create trigger products_touch before update on public.products for each row execute function public.touch_updated_at();

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.memberships enable row level security;
alter table public.plans enable row level security;
alter table public.subscriptions enable row level security;
alter table public.trials enable row level security;
alter table public.leads enable row level security;
alter table public.warehouses enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.inventory_balances enable row level security;
alter table public.stock_movements enable row level security;
alter table public.sales enable row level security;
alter table public.sale_items enable row level security;
alter table public.audit_logs enable row level security;

create policy "profiles_read_own" on public.profiles for select using (id = auth.uid());
create policy "profiles_update_own" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
create policy "plans_read_active" on public.plans for select to authenticated using (is_active);
create policy "organizations_read_member" on public.organizations for select using (public.is_org_member(id));
create policy "memberships_read_org" on public.memberships for select using (user_id = auth.uid() or public.is_org_member(organization_id));
create policy "memberships_manage_admin" on public.memberships for all using (public.has_org_role(organization_id, array['owner','admin']::public.membership_role[])) with check (public.has_org_role(organization_id, array['owner','admin']::public.membership_role[]));
create policy "subscriptions_read_admin" on public.subscriptions for select using (public.has_org_role(organization_id, array['owner','admin']::public.membership_role[]));
create policy "trials_read_member" on public.trials for select using (public.is_org_member(organization_id));
create policy "warehouses_read_member" on public.warehouses for select using (public.is_org_member(organization_id));
create policy "warehouses_manage_inventory" on public.warehouses for all using (public.has_org_role(organization_id, array['owner','admin','inventory_manager']::public.membership_role[])) with check (public.has_org_role(organization_id, array['owner','admin','inventory_manager']::public.membership_role[]));
create policy "products_read_member" on public.products for select using (public.is_org_member(organization_id));
create policy "products_manage_inventory" on public.products for all using (public.has_org_role(organization_id, array['owner','admin','inventory_manager']::public.membership_role[])) with check (public.has_org_role(organization_id, array['owner','admin','inventory_manager']::public.membership_role[]));
create policy "variants_read_member" on public.product_variants for select using (public.is_org_member(organization_id));
create policy "variants_manage_inventory" on public.product_variants for all using (public.has_org_role(organization_id, array['owner','admin','inventory_manager']::public.membership_role[])) with check (public.has_org_role(organization_id, array['owner','admin','inventory_manager']::public.membership_role[]));
create policy "balances_read_member" on public.inventory_balances for select using (public.is_org_member(organization_id));
create policy "balances_manage_inventory" on public.inventory_balances for all using (public.has_org_role(organization_id, array['owner','admin','inventory_manager']::public.membership_role[])) with check (public.has_org_role(organization_id, array['owner','admin','inventory_manager']::public.membership_role[]));
create policy "movements_read_member" on public.stock_movements for select using (public.is_org_member(organization_id));
create policy "movements_create_staff" on public.stock_movements for insert with check (public.has_org_role(organization_id, array['owner','admin','inventory_manager','cashier']::public.membership_role[]));
create policy "sales_read_member" on public.sales for select using (public.is_org_member(organization_id));
create policy "sales_create_staff" on public.sales for insert with check (public.has_org_role(organization_id, array['owner','admin','cashier']::public.membership_role[]));
create policy "sales_manage_admin" on public.sales for update using (public.has_org_role(organization_id, array['owner','admin']::public.membership_role[]));
create policy "sale_items_read_member" on public.sale_items for select using (public.is_org_member(organization_id));
create policy "sale_items_create_staff" on public.sale_items for insert with check (public.has_org_role(organization_id, array['owner','admin','cashier']::public.membership_role[]));
create policy "audit_read_admin" on public.audit_logs for select using (organization_id is not null and public.has_org_role(organization_id, array['owner','admin']::public.membership_role[]));

insert into public.plans (code, name, monthly_price, yearly_price, max_users, max_branches, max_skus, features) values
  ('basic', 'Básico', 49, 490, 2, 1, 2500, '["inventory","sales","cash","basic_reports"]'),
  ('premium', 'Premium', 99, 990, 5, 2, 15000, '["inventory","sales","cash","purchases","suppliers","excel_import"]'),
  ('plus', 'Plus', 179, 1790, 15, 5, 50000, '["inventory","sales","cash","purchases","advanced_roles","audit","advanced_reports"]');
