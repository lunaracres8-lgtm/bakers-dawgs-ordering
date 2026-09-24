-- Baker's Dawgs live restaurant controls
-- Run once in the connected Supabase SQL editor.

create table if not exists public.restaurant_settings (
  id integer primary key default 1 check (id = 1),
  ordering_open boolean not null default true,
  updated_at timestamptz not null default now()
);
insert into public.restaurant_settings(id,ordering_open) values (1,true) on conflict (id) do nothing;

create table if not exists public.menu_availability (
  item_name text primary key,
  available boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.restaurant_settings enable row level security;
alter table public.menu_availability enable row level security;

drop policy if exists "Anyone can read restaurant settings" on public.restaurant_settings;
drop policy if exists "Staff can update restaurant settings" on public.restaurant_settings;
drop policy if exists "Anyone can read menu availability" on public.menu_availability;
drop policy if exists "Staff can manage menu availability" on public.menu_availability;

create policy "Anyone can read restaurant settings" on public.restaurant_settings for select to anon, authenticated using (true);
create policy "Staff can update restaurant settings" on public.restaurant_settings for update to authenticated
using (auth.uid()='e915fbd7-f087-471a-8a22-1c544ab6a263'::uuid)
with check (auth.uid()='e915fbd7-f087-471a-8a22-1c544ab6a263'::uuid);

create policy "Anyone can read menu availability" on public.menu_availability for select to anon, authenticated using (true);
create policy "Staff can manage menu availability" on public.menu_availability for all to authenticated
using (auth.uid()='e915fbd7-f087-471a-8a22-1c544ab6a263'::uuid)
with check (auth.uid()='e915fbd7-f087-471a-8a22-1c544ab6a263'::uuid);

grant select on public.restaurant_settings, public.menu_availability to anon, authenticated;
grant update on public.restaurant_settings to authenticated;
grant insert, update, delete on public.menu_availability to authenticated;
