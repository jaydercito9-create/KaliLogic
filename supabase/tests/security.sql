-- Run only against a disposable/local Supabase database after migrations.
begin;

create or replace function pg_temp.assert_true(condition boolean, message text)
returns void language plpgsql as $$
begin
  if not condition then raise exception 'assertion failed: %', message; end if;
end;
$$;

create or replace function pg_temp.assert_raises(statement text, message text)
returns void language plpgsql as $$
begin
  begin
    execute statement;
  exception when others then
    return;
  end;
  raise exception 'assertion failed: expected error: %', message;
end;
$$;

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'a@test.local', crypt('test', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'b@test.local', crypt('test', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'none@test.local', crypt('test', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000004', 'authenticated', 'authenticated', 'admin@test.local', crypt('test', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000005', 'authenticated', 'authenticated', 'onboard@test.local', crypt('test', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now());

update public.profiles set is_platform_admin = true where id = '10000000-0000-0000-0000-000000000004';

insert into public.organizations (id, name, slug, business_type, status) values
  ('20000000-0000-0000-0000-000000000001', 'Org A', 'security-test-a', 'Otro comercio', 'trial'),
  ('20000000-0000-0000-0000-000000000002', 'Org B', 'security-test-b', 'Otro comercio', 'trial');

insert into public.trials (organization_id, status, started_at, expires_at) values
  ('20000000-0000-0000-0000-000000000001', 'active', now(), now() + interval '1 day'),
  ('20000000-0000-0000-0000-000000000002', 'active', now(), now() + interval '1 day');

insert into public.memberships (organization_id, user_id, role) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'owner'),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'owner');

insert into public.warehouses (id, organization_id, name, is_primary) values
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Principal', true),
  ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 'Principal', true);

insert into public.products (id, organization_id, name, sku, sale_price, cost_price) values
  ('40000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Producto A', 'A-1', 10, 4),
  ('40000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 'Producto B', 'B-1', 50, 20);

insert into public.inventory_balances (organization_id, warehouse_id, product_id, quantity, minimum_quantity) values
  ('20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 5, 1),
  ('20000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', 5, 1);

insert into public.leads (full_name, company_name, email, phone, business_type, consented_at)
values ('Lead', 'Lead Co', 'lead@test.local', '999999999', 'Otro comercio', now());

set local role anon;
select pg_temp.assert_raises(
  $$select public.submit_demo_request('Demo', 'Demo Co', 'demo@test.local', '999999999', 'Otro comercio', repeat('a', 64), false)$$,
  'demo requires consent'
);
select public.submit_demo_request('Demo', 'Demo Co', 'demo@test.local', '999999999', 'Otro comercio', repeat('a', 64), true);
select public.submit_demo_request('Demo', 'Demo Co', 'demo@test.local', '999999999', 'Otro comercio', repeat('a', 64), true);
select public.submit_demo_request('Demo', 'Demo Co', 'demo@test.local', '999999999', 'Otro comercio', repeat('a', 64), true);
select pg_temp.assert_raises(
  $$select public.submit_demo_request('Demo', 'Demo Co', 'demo@test.local', '999999999', 'Otro comercio', repeat('a', 64), true)$$,
  'demo rate limit is enforced'
);
reset role;

insert into public.leads (full_name, company_name, email, phone, business_type, consented_at)
values ('Onboard', 'Onboard Co', 'onboard@test.local', '999999999', 'Otro comercio', now());
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000005', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000005","role":"authenticated"}', true);
select public.provision_demo_organization();
select public.provision_demo_organization();
reset role;
select pg_temp.assert_true((select count(*) = 1 from public.memberships where user_id = '10000000-0000-0000-0000-000000000005'), 'demo provisioning is idempotent');

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
select pg_temp.assert_true((select count(*) = 0 from public.organizations where id = '20000000-0000-0000-0000-000000000002'), 'normal user cannot read another organization');
select pg_temp.assert_true((select count(*) = 0 from public.leads), 'normal user cannot read leads');
select pg_temp.assert_raises(
  $$select * from public.register_sale('[{"product_id":"40000000-0000-0000-0000-000000000002","quantity":1}]', '', 'efectivo')$$,
  'another organization product cannot be sold'
);
select pg_temp.assert_raises(
  $$select * from public.register_sale('[{"product_id":"40000000-0000-0000-0000-000000000001","quantity":99}]', '', 'efectivo')$$,
  'insufficient stock fails'
);
reset role;
select pg_temp.assert_true((select count(*) = 0 from public.sales where organization_id = '20000000-0000-0000-0000-000000000001'), 'failed sale created no header');
select pg_temp.assert_true((select quantity = 5 from public.inventory_balances where product_id = '40000000-0000-0000-0000-000000000001'), 'failed sale changed no stock');

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000003', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000003","role":"authenticated"}', true);
select pg_temp.assert_raises(
  $$select * from public.register_sale('[{"product_id":"40000000-0000-0000-0000-000000000001","quantity":1}]', '', 'efectivo')$$,
  'user without membership cannot sell'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
select * from public.register_sale(
  '[{"product_id":"40000000-0000-0000-0000-000000000001","quantity":2,"unit_price":0.01}]',
  'Cliente',
  'efectivo'
);
reset role;
select pg_temp.assert_true((select total = 20 and discount = 0 from public.sales where organization_id = '20000000-0000-0000-0000-000000000001'), 'database price is authoritative');
select pg_temp.assert_true((select unit_price = 10 and total = 20 from public.sale_items where product_id = '40000000-0000-0000-0000-000000000001'), 'sale detail uses real price');
select pg_temp.assert_true((select quantity = 3 from public.inventory_balances where product_id = '40000000-0000-0000-0000-000000000001'), 'valid sale decrements stock');

update public.plans set max_users = 1, max_branches = 1, max_skus = 1 where code = 'basic';
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
select pg_temp.assert_raises(
  $$insert into public.products (organization_id, name, sku) values ('20000000-0000-0000-0000-000000000001', 'Segundo', 'A-2')$$,
  'SKU limit is enforced'
);
select pg_temp.assert_raises(
  $$insert into public.warehouses (organization_id, name) values ('20000000-0000-0000-0000-000000000001', 'Segunda')$$,
  'branch limit is enforced'
);
select pg_temp.assert_raises(
  $$insert into public.memberships (organization_id, user_id, role) values ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', 'viewer')$$,
  'user limit is enforced'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000004', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000004","role":"authenticated"}', true);
select pg_temp.assert_true((select count(*) >= 2 from public.organizations), 'platform admin reads organizations');
select pg_temp.assert_true((select count(*) >= 1 from public.leads), 'platform admin reads leads');
reset role;

update public.trials set expires_at = now() - interval '1 minute' where organization_id = '20000000-0000-0000-0000-000000000001';
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
select pg_temp.assert_raises(
  $$select * from public.register_sale('[{"product_id":"40000000-0000-0000-0000-000000000001","quantity":1}]', '', 'efectivo')$$,
  'expired trial blocks sales'
);
reset role;

rollback;
