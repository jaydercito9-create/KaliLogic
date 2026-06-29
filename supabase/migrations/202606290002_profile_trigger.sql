-- Migration: auto-create profiles row on new user signup
-- Without this trigger, profiles.is_platform_admin never exists and /control guard always redirects to /app

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'phone', null)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Drop if it already exists from a previous run, then recreate
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Grant execute so the trigger can run under service role
grant execute on function public.handle_new_user() to service_role;
