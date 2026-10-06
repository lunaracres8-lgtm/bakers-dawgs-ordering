-- Applied and verified 2026-10-06. Keeps the existing authorized owner account.
-- New employee accounts need explicitly provisioned authorization before use.
begin;
drop policy if exists "Customer can create orders" on public.orders;
drop policy if exists "Customers can place orders" on public.orders;
create policy "Customers can place orders" on public.orders for insert to anon
with check (status = 'New' and payment_method is null and total >= 0 and jsonb_typeof(items)='array' and jsonb_array_length(items)>0);
drop policy if exists "Authenticated staff can read orders" on public.orders;
drop policy if exists "Authenticated staff can update orders" on public.orders;
drop policy if exists "Authenticated staff can delete orders" on public.orders;
drop policy if exists "Owner can create staff orders" on public.orders;
create policy "Owner can create staff orders" on public.orders for insert to authenticated
with check ((select auth.uid())='e915fbd7-f087-471a-8a22-1c544ab6a263'::uuid);
drop policy if exists "staff full access" on public.menu_items;
drop policy if exists "authenticated manage menu availability" on public.menu_availability;
drop policy if exists "Owner can manage availability" on public.menu_availability;
create policy "Owner can manage availability" on public.menu_availability for all to authenticated
using ((select auth.uid())='e915fbd7-f087-471a-8a22-1c544ab6a263'::uuid)
with check ((select auth.uid())='e915fbd7-f087-471a-8a22-1c544ab6a263'::uuid);
drop policy if exists "authenticated update restaurant settings" on public.restaurant_settings;
drop policy if exists "Owner can update restaurant settings" on public.restaurant_settings;
create policy "Owner can update restaurant settings" on public.restaurant_settings for update to authenticated
using ((select auth.uid())='e915fbd7-f087-471a-8a22-1c544ab6a263'::uuid)
with check ((select auth.uid())='e915fbd7-f087-471a-8a22-1c544ab6a263'::uuid);
alter policy "Staff can insert business branding" on public.business_branding
with check (id=1 and (select auth.uid())='e915fbd7-f087-471a-8a22-1c544ab6a263'::uuid);
alter policy "Staff can update business branding" on public.business_branding
using (id=1 and (select auth.uid())='e915fbd7-f087-471a-8a22-1c544ab6a263'::uuid)
with check (id=1 and (select auth.uid())='e915fbd7-f087-471a-8a22-1c544ab6a263'::uuid);
commit;
