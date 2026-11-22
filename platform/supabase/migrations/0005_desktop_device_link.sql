-- Desktop sign-in without typing a password into the app: the app asks for a short code
-- (device_link_start, anon), the user approves it on the dashboard while signed in (device_link_approve),
-- and from then on the app proves itself with its device id + secret (device_check, anon).
-- NOT YET APPLIED to the live project (2026-11-22: the apply call waited for the owner's confirmation and timed out).
alter table public.devices add column if not exists secret_hash text;

create table if not exists public.device_links (
  code text primary key,
  device_id text not null check (char_length(device_id) between 8 and 100),
  name text not null default '',
  platform text not null default '',
  secret_hash text not null,
  created_at timestamptz not null default now()
);
alter table public.device_links enable row level security;
revoke all on public.device_links from anon, authenticated;

create or replace function public.device_link_start(p_device_id text, p_secret text, p_name text default '', p_platform text default '')
returns jsonb language plpgsql security definer set search_path = public as $$
declare c text; i int := 0;
begin
  if char_length(coalesce(p_device_id, '')) not between 8 and 100 or char_length(coalesce(p_secret, '')) not between 24 and 200 then
    return jsonb_build_object('ok', false, 'reason', 'bad_request');
  end if;
  delete from public.device_links where created_at < now() - interval '30 minutes';
  delete from public.device_links where device_id = p_device_id;
  loop
    c := upper(substr(translate(encode(sha256(convert_to(gen_random_uuid()::text || clock_timestamp()::text, 'UTF8')), 'hex'), '01ol', 'wxyz'), 1, 8));
    begin
      insert into public.device_links (code, device_id, name, platform, secret_hash)
        values (c, p_device_id, left(coalesce(p_name, ''), 120), left(coalesce(p_platform, ''), 40), encode(sha256(convert_to(p_secret, 'UTF8')), 'hex'));
      exit;
    exception when unique_violation then i := i + 1; if i > 5 then raise; end if; end;
  end loop;
  return jsonb_build_object('ok', true, 'code', c, 'expires_in', 1800);
end $$;

create or replace function public.device_link_info(p_code text) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare l public.device_links;
begin
  if auth.uid() is null then return jsonb_build_object('ok', false, 'reason', 'signed_out'); end if;
  select * into l from public.device_links where code = upper(p_code) and created_at > now() - interval '30 minutes';
  if l.code is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  return jsonb_build_object('ok', true, 'name', l.name, 'platform', l.platform);
end $$;

create or replace function public.device_link_approve(p_code text) returns jsonb language plpgsql security definer set search_path = public as $$
declare l public.device_links; p public.profiles; n int; known boolean;
begin
  if auth.uid() is null then return jsonb_build_object('ok', false, 'reason', 'signed_out'); end if;
  select * into p from public.profiles where id = auth.uid();
  if p.id is null or p.status = 'pending' then return jsonb_build_object('ok', false, 'reason', 'pending'); end if;
  if p.status = 'blocked' then return jsonb_build_object('ok', false, 'reason', 'blocked'); end if;
  if p.valid_until is not null and p.valid_until <= now() then return jsonb_build_object('ok', false, 'reason', 'expired'); end if;
  select * into l from public.device_links where code = upper(p_code) and created_at > now() - interval '30 minutes';
  if l.code is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  select exists (select 1 from public.devices where user_id = p.id and device_id = l.device_id) into known;
  if known then
    update public.devices set secret_hash = l.secret_hash, name = l.name, platform = l.platform, last_seen = now() where user_id = p.id and device_id = l.device_id;
  else
    select count(*) into n from public.devices where user_id = p.id;
    if n >= p.max_devices and not p.is_admin then return jsonb_build_object('ok', false, 'reason', 'device_limit', 'devices', n, 'max_devices', p.max_devices); end if;
    insert into public.devices (user_id, device_id, name, platform, secret_hash) values (p.id, l.device_id, l.name, l.platform, l.secret_hash);
  end if;
  delete from public.device_links where code = l.code;
  return jsonb_build_object('ok', true, 'name', l.name);
end $$;

create or replace function public.device_check(p_device_id text, p_secret text) returns jsonb language plpgsql security definer set search_path = public as $$
declare d public.devices; p public.profiles;
begin
  select * into d from public.devices where device_id = p_device_id and secret_hash is not null
    and secret_hash = encode(sha256(convert_to(coalesce(p_secret, ''), 'UTF8')), 'hex') limit 1;
  if d.id is null then return jsonb_build_object('ok', false, 'reason', 'not_linked'); end if;
  select * into p from public.profiles where id = d.user_id;
  if p.id is null or p.status = 'pending' then return jsonb_build_object('ok', false, 'reason', 'pending'); end if;
  if p.status = 'blocked' then return jsonb_build_object('ok', false, 'reason', 'blocked'); end if;
  if p.valid_until is not null and p.valid_until <= now() then return jsonb_build_object('ok', false, 'reason', 'expired'); end if;
  update public.devices set last_seen = now() where id = d.id;
  return jsonb_build_object('ok', true, 'email', p.email, 'plan', p.plan, 'valid_until', p.valid_until, 'server_time', extract(epoch from now())::bigint);
end $$;

revoke all on function public.device_link_start(text, text, text, text) from public;
revoke all on function public.device_link_info(text) from public, anon;
revoke all on function public.device_link_approve(text) from public, anon;
revoke all on function public.device_check(text, text) from public;
grant execute on function public.device_link_start(text, text, text, text) to anon, authenticated;
grant execute on function public.device_check(text, text) to anon, authenticated;
grant execute on function public.device_link_info(text) to authenticated;
grant execute on function public.device_link_approve(text) to authenticated;
