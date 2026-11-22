-- Sign-up collects a name and a mobile number (for WhatsApp OTP login through Vivid Relay later).
-- Applied to the live project on 2026-11-22.
alter table public.profiles add column if not exists phone text;
create unique index if not exists profiles_phone_key on public.profiles (phone) where phone is not null;

-- 10 digits -> +91XXXXXXXXXX; 11-15 digits (country code included) -> +digits; anything else -> null
create or replace function public.normalize_phone(p text) returns text language plpgsql immutable set search_path = public as $$
declare d text := regexp_replace(coalesce(p, ''), '[^0-9]', '', 'g');
begin
  if char_length(d) = 11 and left(d, 1) = '0' then d := substr(d, 2); end if;
  if char_length(d) = 10 then return '+91' || d; end if;
  if char_length(d) between 11 and 15 then return '+' || d; end if;
  return null;
end $$;

-- the profile takes name and phone from the sign-up metadata; a number already in use is left empty
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
declare nm text := nullif(trim(coalesce(new.raw_user_meta_data->>'name', '')), '');
        ph text := public.normalize_phone(new.raw_user_meta_data->>'phone');
begin
  if ph is not null and exists (select 1 from public.profiles where phone = ph) then ph := null; end if;
  insert into public.profiles (id, display_name, email, phone)
    values (new.id, left(coalesce(nm, split_part(new.email, '@', 1)), 80), new.email, ph) on conflict do nothing;
  return new;
end $$;

create or replace function public.phone_available(p text) returns boolean language sql stable security definer set search_path = public as $$
  select public.normalize_phone(p) is not null and not exists (select 1 from public.profiles where phone = public.normalize_phone(p)) $$;

create or replace function public.set_my_contact(p_name text, p_phone text) returns jsonb language plpgsql security definer set search_path = public as $$
declare ph text := public.normalize_phone(p_phone); nm text := nullif(trim(coalesce(p_name, '')), '');
begin
  if auth.uid() is null then return jsonb_build_object('ok', false, 'reason', 'signed_out'); end if;
  if ph is null then return jsonb_build_object('ok', false, 'reason', 'bad_phone'); end if;
  if exists (select 1 from public.profiles where phone = ph and id <> auth.uid()) then return jsonb_build_object('ok', false, 'reason', 'phone_taken'); end if;
  update public.profiles set phone = ph, display_name = coalesce(left(nm, 80), display_name) where id = auth.uid();
  return jsonb_build_object('ok', true, 'phone', ph);
end $$;

revoke all on function public.phone_available(text) from public;
revoke all on function public.set_my_contact(text, text) from public, anon;
grant execute on function public.phone_available(text) to anon, authenticated;
grant execute on function public.set_my_contact(text, text) to authenticated;
