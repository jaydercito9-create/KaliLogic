-- KaliLogic: Auto-create profile row when a new auth user is created
-- Run this in Supabase SQL Editor if you signed up users before having this trigger.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone, is_platform_admin)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.raw_user_meta_data->>'phone',
    false
  );
  return new;
end;
$$;

-- Drop if exists to avoid duplicates
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
