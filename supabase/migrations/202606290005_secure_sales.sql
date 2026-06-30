-- One authenticated RPC owns sale totals, stock and tenant selection.

create unique index inventory_balance_item_unique
on public.inventory_balances (organization_id, warehouse_id, product_id, variant_id)
nulls not distinct;

alter table public.products
  add constraint products_nonnegative_prices check (sale_price >= 0 and cost_price >= 0);
alter table public.sales
  add constraint sales_valid_totals check (subtotal >= 0 and discount >= 0 and discount <= subtotal and total = subtotal - discount);
alter table public.sale_items
  add constraint sale_items_valid_totals check (quantity > 0 and unit_price >= 0 and total = round(unit_price * quantity, 2));

-- Sales can only be created through register_sale; direct REST inserts would bypass totals and stock.
drop policy if exists "sales_create_staff" on public.sales;
drop policy if exists "sale_items_create_staff" on public.sale_items;

create or replace function public.register_sale(
  p_items jsonb,
  p_customer_name text default null,
  p_payment_method text default 'efectivo'
)
returns table (sale_id uuid, sale_number bigint, total numeric)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user_id uuid := auth.uid();
  v_membership_count integer;
  v_organization_id uuid;
  v_role public.membership_role;
  v_warehouse_id uuid;
  v_sale_id uuid;
  v_sale_number bigint;
  v_subtotal numeric(12,2) := 0;
  v_price numeric(12,2);
  v_balance_id uuid;
  v_stock numeric(14,3);
  item record;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  select count(*) into v_membership_count
  from public.memberships
  where user_id = v_user_id and is_active;

  if v_membership_count = 0 then
    raise exception 'Active membership required' using errcode = '42501';
  end if;
  if v_membership_count > 1 then
    -- ponytail: add an explicit active-organization selector when multi-org ships.
    raise exception 'Multiple active organizations require explicit selection' using errcode = '42501';
  end if;

  select organization_id, role into v_organization_id, v_role
  from public.memberships
  where user_id = v_user_id and is_active;

  if v_role not in ('owner', 'admin', 'cashier') then
    raise exception 'Role cannot register sales' using errcode = '42501';
  end if;
  if not public.organization_can_write(v_organization_id) then
    raise exception 'Trial or subscription is not active' using errcode = '42501';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 100 then
    raise exception 'Sale must contain between 1 and 100 items' using errcode = '22023';
  end if;
  if p_payment_method is null or p_payment_method not in ('efectivo', 'tarjeta', 'yape', 'transferencia') then
    raise exception 'Invalid payment method' using errcode = '22023';
  end if;
  if length(coalesce(p_customer_name, '')) > 120 then
    raise exception 'Customer name is too long' using errcode = '22023';
  end if;

  select id into v_warehouse_id
  from public.warehouses
  where organization_id = v_organization_id and is_active
  order by is_primary desc, created_at, id
  limit 1;

  if v_warehouse_id is null then
    raise exception 'Active warehouse required' using errcode = '23514';
  end if;

  -- Lock every product and balance in a deterministic order before writing anything.
  for item in
    select parsed.product_id, sum(parsed.quantity)::numeric(14,3) as quantity
    from jsonb_to_recordset(p_items) as parsed(product_id uuid, quantity numeric)
    group by parsed.product_id
    order by parsed.product_id
  loop
    if item.product_id is null or item.quantity <= 0 or item.quantity <> round(item.quantity, 3) then
      raise exception 'Invalid product quantity' using errcode = '22023';
    end if;

    select p.sale_price, balances.id, balances.quantity
    into v_price, v_balance_id, v_stock
    from public.products p
    join public.inventory_balances balances
      on balances.organization_id = p.organization_id
      and balances.product_id = p.id
      and balances.warehouse_id = v_warehouse_id
      and balances.variant_id is null
    where p.id = item.product_id
      and p.organization_id = v_organization_id
      and p.is_active
    for update of p, balances;

    if not found then
      raise exception 'Product is unavailable for this organization' using errcode = '23503';
    end if;
    if v_stock < item.quantity then
      raise exception 'Insufficient stock for product %', item.product_id using errcode = '23514';
    end if;

    v_subtotal := v_subtotal + round(v_price * item.quantity, 2);
  end loop;

  insert into public.sales as created (
    organization_id, customer_name, subtotal, discount, total,
    payment_method, status, created_by
  ) values (
    v_organization_id, nullif(btrim(p_customer_name), ''), v_subtotal, 0, v_subtotal,
    p_payment_method, 'completed', v_user_id
  )
  returning created.id, created.sale_number into v_sale_id, v_sale_number;

  for item in
    select parsed.product_id, sum(parsed.quantity)::numeric(14,3) as quantity
    from jsonb_to_recordset(p_items) as parsed(product_id uuid, quantity numeric)
    group by parsed.product_id
    order by parsed.product_id
  loop
    select p.sale_price, balances.id
    into v_price, v_balance_id
    from public.products p
    join public.inventory_balances balances
      on balances.organization_id = p.organization_id
      and balances.product_id = p.id
      and balances.warehouse_id = v_warehouse_id
      and balances.variant_id is null
    where p.id = item.product_id and p.organization_id = v_organization_id;

    insert into public.sale_items (
      organization_id, sale_id, product_id, quantity, unit_price, total
    ) values (
      v_organization_id, v_sale_id, item.product_id, item.quantity,
      v_price, round(v_price * item.quantity, 2)
    );

    update public.inventory_balances
    set quantity = quantity - item.quantity, updated_at = now()
    where id = v_balance_id;

    insert into public.stock_movements (
      organization_id, warehouse_id, product_id, movement_type,
      quantity, reference_type, reference_id, notes, created_by
    ) values (
      v_organization_id, v_warehouse_id, item.product_id, 'sale',
      -item.quantity, 'sale', v_sale_id, 'Venta registrada', v_user_id
    );
  end loop;

  return query select v_sale_id, v_sale_number, v_subtotal;
end;
$$;

revoke all on function public.register_sale(jsonb, text, text) from public;
grant execute on function public.register_sale(jsonb, text, text) to authenticated;
