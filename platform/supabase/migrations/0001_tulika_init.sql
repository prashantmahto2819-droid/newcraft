-- Tulika suite: shared accounts, projects and brand kits. Run in the Supabase SQL editor
-- or with `supabase db push`. Every table is protected by row level security.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  app text not null check (app in ('vector','photo','film','pdf')),
  name text not null check (char_length(name) between 1 and 200),
  file_path text,            -- object path inside the 'projects' storage bucket
  thumb_path text,           -- optional preview image in the same bucket
  size_bytes bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists projects_owner_updated_idx on public.projects (owner_id, updated_at desc);

create table if not exists public.brand_kits (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  colors jsonb not null default '[]',   -- ["#0f766e", ...]
  fonts jsonb not null default '[]',    -- ["Noto Sans Devanagari", ...]
  created_at timestamptz not null default now()
);

alter table public.profiles   enable row level security;
alter table public.projects   enable row level security;
alter table public.brand_kits enable row level security;

create policy "own profile"    on public.profiles   for all using (id = auth.uid())       with check (id = auth.uid());
create policy "own projects"   on public.projects  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "own brand kits" on public.brand_kits for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- keep updated_at fresh
create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists projects_touch on public.projects;
create trigger projects_touch before update on public.projects for each row execute function public.touch_updated_at();

-- create a profile row automatically for each new user
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin insert into public.profiles (id, display_name) values (new.id, split_part(new.email, '@', 1)) on conflict do nothing; return new; end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- private storage bucket; each user may only touch objects under a folder named after their user id
insert into storage.buckets (id, name, public, file_size_limit)
values ('projects', 'projects', false, 524288000)   -- 500 MB per file
on conflict (id) do nothing;

create policy "own project files read"   on storage.objects for select using (bucket_id = 'projects' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own project files write"  on storage.objects for insert with check (bucket_id = 'projects' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own project files update" on storage.objects for update using (bucket_id = 'projects' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own project files delete" on storage.objects for delete using (bucket_id = 'projects' and (storage.foldername(name))[1] = auth.uid()::text);
