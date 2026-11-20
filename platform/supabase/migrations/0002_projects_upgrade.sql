-- Dashboard v2: favourites and free-form metadata (template, size, notes) on projects.
alter table public.projects add column if not exists favorite boolean not null default false;
alter table public.projects add column if not exists meta jsonb not null default '{}';
create index if not exists projects_owner_fav_idx on public.projects (owner_id, favorite) where favorite;
