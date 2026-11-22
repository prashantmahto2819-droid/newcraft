-- Tulika access control: a new account stays "pending" until an admin approves it; an optional plan and
-- validity date gate use as well. Users cannot change their own status (column grants + RPCs).

alter table public.profiles
  add column if not exists email text,
  add column if not exists status text not null default 'pending' check (status in ('pending', 'approved', 'blocked')),
  add column if not exists is_admin boolean not null default false,
  add column if not exists plan text not null default 'free',
  add column if not exists valid_until timestamptz,
  add column if not exists approved_at timestamptz;

-- accounts that already existed keep working; the earliest one becomes the admin
insert into public.profiles (id, display_name) select u.id, split_part(u.email, '@', 1) from auth.users u on conflict do nothing;
update public.profiles p set email = u.email from auth.users u where u.id = p.id and p.email is null;
update public.profiles set status = 'approved', approved_at = now() where approved_at is null and status = 'pending' and id in (select id from auth.users where created_at < timestamptz '2026-11-22 03:00:00+00');
update public.profiles set is_admin = true where id = (select id from auth.users order by created_at limit 1)
  and not exists (select 1 from public.profiles where is_admin);

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, email) values (new.id, split_part(new.email, '@', 1), new.email) on conflict do nothing;
  return new;
end $$;

create or replace function public.is_admin() returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false) $$;

create or replace function public.has_access() returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select status = 'approved' and (valid_until is null or valid_until > now()) from public.profiles where id = auth.uid()), false) $$;

-- a user reads their own row and may change only the display name; everything else goes through the admin RPCs
drop policy if exists "own profile" on public.profiles;
create policy "read own profile" on public.profiles for select using (id = auth.uid());
create policy "rename own profile" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
revoke insert, update, delete on public.profiles from anon, authenticated;
grant update (display_name) on public.profiles to authenticated;

create or replace function public.admin_list_users() returns setof public.profiles language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'admin only'; end if;
  return query select * from public.profiles order by (status = 'pending') desc, created_at desc;
end $$;

create or replace function public.admin_set_access(target uuid, new_status text, new_plan text default null, new_valid_until timestamptz default null, make_admin boolean default null)
returns public.profiles language plpgsql security definer set search_path = public as $$
declare r public.profiles;
begin
  if not public.is_admin() then raise exception 'admin only'; end if;
  if new_status not in ('pending', 'approved', 'blocked') then raise exception 'bad status'; end if;
  if target = auth.uid() and (new_status <> 'approved' or make_admin is false) then raise exception 'an admin cannot lock themselves out'; end if;
  update public.profiles set status = new_status, plan = coalesce(new_plan, plan), valid_until = new_valid_until,
    is_admin = coalesce(make_admin, is_admin), approved_at = case when new_status = 'approved' then coalesce(approved_at, now()) else approved_at end
    where id = target returning * into r;
  return r;
end $$;
revoke all on function public.admin_list_users() from public, anon;
revoke all on function public.admin_set_access(uuid, text, text, timestamptz, boolean) from public, anon;
grant execute on function public.admin_list_users() to authenticated;
grant execute on function public.admin_set_access(uuid, text, text, timestamptz, boolean) to authenticated;

-- data is usable only with access
drop policy if exists "own projects" on public.projects;
create policy "own projects" on public.projects for all using (owner_id = auth.uid() and public.has_access()) with check (owner_id = auth.uid() and public.has_access());
drop policy if exists "own brand kits" on public.brand_kits;
create policy "own brand kits" on public.brand_kits for all using (owner_id = auth.uid() and public.has_access()) with check (owner_id = auth.uid() and public.has_access());
