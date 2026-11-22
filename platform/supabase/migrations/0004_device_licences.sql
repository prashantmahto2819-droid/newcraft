-- Multi-device licences: each account may be used on `profiles.max_devices` devices (default 2; admins are not
-- limited). A device registers itself through register_device(); rows are written only by the RPCs.
-- Applied to the live project on 2026-11-22 (same statements as below).
alter table public.profiles add column if not exists max_devices integer not null default 2 check (max_devices between 1 and 100);

create table if not exists public.devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  device_id text not null check (char_length(device_id) between 8 and 100),
  name text not null default '' check (char_length(name) <= 120),
  platform text not null default '' check (char_length(platform) <= 40),
  created_at timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  unique (user_id, device_id)
);
alter table public.devices enable row level security;
drop policy if exists "read own devices" on public.devices;
create policy "read own devices" on public.devices for select using (user_id = auth.uid());
revoke insert, update, delete on public.devices from anon, authenticated;

-- returns {ok:true, plan, valid_until, is_admin, devices, max_devices, server_time} or {ok:false, reason: signed_out|pending|blocked|expired|device_limit}
create or replace function public.register_device(p_device_id text, p_name text default '', p_platform text default '')
returns jsonb language plpgsql security definer set search_path = public as $$
declare p public.profiles; n int; known boolean;
begin
  if auth.uid() is null then return jsonb_build_object('ok', false, 'reason', 'signed_out'); end if;
  select * into p from public.profiles where id = auth.uid();
  if p.id is null or p.status = 'pending' then return jsonb_build_object('ok', false, 'reason', 'pending'); end if;
  if p.status = 'blocked' then return jsonb_build_object('ok', false, 'reason', 'blocked'); end if;
  if p.valid_until is not null and p.valid_until <= now() then return jsonb_build_object('ok', false, 'reason', 'expired', 'valid_until', p.valid_until); end if;
  select exists (select 1 from public.devices where user_id = p.id and device_id = p_device_id) into known;
  if known then
    update public.devices set last_seen = now(), name = case when p_name <> '' then left(p_name, 120) else name end where user_id = p.id and device_id = p_device_id;
  else
    select count(*) into n from public.devices where user_id = p.id;
    if n >= p.max_devices and not p.is_admin then
      return jsonb_build_object('ok', false, 'reason', 'device_limit', 'devices', n, 'max_devices', p.max_devices);
    end if;
    insert into public.devices (user_id, device_id, name, platform) values (p.id, p_device_id, left(coalesce(p_name, ''), 120), left(coalesce(p_platform, ''), 40));
  end if;
  select count(*) into n from public.devices where user_id = p.id;
  return jsonb_build_object('ok', true, 'plan', p.plan, 'valid_until', p.valid_until, 'is_admin', p.is_admin, 'devices', n, 'max_devices', p.max_devices, 'server_time', now());
end $$;

create or replace function public.remove_device(p_id uuid) returns boolean language plpgsql security definer set search_path = public as $$
begin
  delete from public.devices where id = p_id and (user_id = auth.uid() or public.is_admin());
  return found;
end $$;

create or replace function public.admin_list_devices() returns setof public.devices language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'admin only'; end if;
  return query select * from public.devices order by last_seen desc;
end $$;

create or replace function public.admin_set_max_devices(target uuid, n integer) returns integer language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'admin only'; end if;
  update public.profiles set max_devices = n where id = target;
  return n;
end $$;

revoke all on function public.register_device(text, text, text) from public, anon;
revoke all on function public.remove_device(uuid) from public, anon;
revoke all on function public.admin_list_devices() from public, anon;
revoke all on function public.admin_set_max_devices(uuid, integer) from public, anon;
grant execute on function public.register_device(text, text, text) to authenticated;
grant execute on function public.remove_device(uuid) to authenticated;
grant execute on function public.admin_list_devices() to authenticated;
grant execute on function public.admin_set_max_devices(uuid, integer) to authenticated;
