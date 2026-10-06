-- Baker's Dawgs: public customer orders and the existing authorized owner.
-- New staff accounts must be explicitly authorized before they can administer orders.
begin;
alter table public.orders enable row level security;
drop policy if exists "Customer can create orders" on public.orders;
drop policy if exists "Customers can place orders" on public.orders;
drop policy if exists "Authenticated staff can read orders" on public.orders;
drop policy if exists "Authenticated staff can update orders" on public.orders;
drop policy if exists "Authenticated staff can delete orders" on public.orders;
drop policy if exists "Owner can create staff orders" on public.orders;
drop policy if exists "Owner can read orders" on public.orders;
drop policy if exists "Owner can update orders" on public.orders;
drop policy if exists "Owner can delete orders" on public.orders;
create policy "Customers can place orders" on public.orders for insert to anon
with check (status='New' and payment_method is null and total>=0 and jsonb_typeof(items)='array' and jsonb_array_length(items)>0);
create policy "Owner can create staff orders" on public.orders for insert to authenticated
with check ((select auth.uid())='e915fbd7-f087-471a-8a22-1c544ab6a263'::uuid);
create policy "Owner can read orders" on public.orders for select to authenticated
using ((select auth.uid())='e915fbd7-f087-471a-8a22-1c544ab6a263'::uuid);
create policy "Owner can update orders" on public.orders for update to authenticated
using ((select auth.uid())='e915fbd7-f087-471a-8a22-1c544ab6a263'::uuid)
with check ((select auth.uid())='e915fbd7-f087-471a-8a22-1c544ab6a263'::uuid);
create policy "Owner can delete orders" on public.orders for delete to authenticated
using ((select auth.uid())='e915fbd7-f087-471a-8a22-1c544ab6a263'::uuid);
grant insert on public.orders to anon, authenticated;
grant select, update, delete on public.orders to authenticated;
commit;
