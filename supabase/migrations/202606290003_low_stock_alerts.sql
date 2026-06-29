create view public.low_stock_alerts
with (security_invoker = true)
as
select
  balances.organization_id,
  products.name as product_name,
  products.sku,
  balances.quantity,
  balances.minimum_quantity as minimum
from public.inventory_balances as balances
join public.products as products
  on products.id = balances.product_id
  and products.organization_id = balances.organization_id
where products.is_active
  and balances.quantity <= balances.minimum_quantity;

grant select on public.low_stock_alerts to authenticated;
