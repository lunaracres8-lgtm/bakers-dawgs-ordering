-- Baker's Dawgs order-path security fix
-- Run once in the connected Supabase SQL editor.
-- Customer checkout uses the public anon key for INSERT.
-- Staff order-board actions use an authenticated Supabase session.

alter table if exists public.orders enable row level security;

drop policy if exists "Customer can create orders" on public.orders;
drop policy if exists "Authenticated staff can read orders" on public.orders;
drop policy if exists "Authenticated staff can update orders" on public.orders;
drop policy if exists "Authenticated staff can delete orders" on public.orders;

create policy "Customer can create orders"
on public.orders
for insert
to anon, authenticated
with check (true);

create policy "Authenticated staff can read orders"
on public.orders
for select
to authenticated
using (auth.uid() is not null);

create policy "Authenticated staff can update orders"
on public.orders
for update
to authenticated
using (auth.uid() is not null)
with check (auth.uid() is not null);

create policy "Authenticated staff can delete orders"
on public.orders
for delete
to authenticated
using (auth.uid() is not null);

grant insert on public.orders to anon, authenticated;
grant select, update, delete on public.orders to authenticated;
