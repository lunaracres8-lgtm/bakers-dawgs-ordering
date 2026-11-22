-- Customer receipt capabilities expose only pickup status, never an order list.
create schema if not exists bd_customer;
revoke all on schema bd_customer from public;
grant usage on schema bd_customer to anon, authenticated;

create table public.customer_showcase (
 id integer primary key check(id=1),
 photos jsonb not null default '[]'::jsonb check(jsonb_typeof(photos)='array' and jsonb_array_length(photos)<=6 and octet_length(photos::text)<2000000)
);
alter table public.customer_showcase enable row level security;
create policy "Anyone reads food photos" on public.customer_showcase for select to anon,authenticated using(id=1);
create policy "Owner manages food photos" on public.customer_showcase for all to authenticated
 using((select auth.uid())='e915fbd7-f087-471a-8a22-1c544ab6a263'::uuid)
 with check((select auth.uid())='e915fbd7-f087-471a-8a22-1c544ab6a263'::uuid);
grant select on public.customer_showcase to anon;
grant select,insert,update on public.customer_showcase to authenticated;
insert into public.customer_showcase(id) values(1);

create table public.customer_reviews (
 id uuid primary key default gen_random_uuid(),
 order_id uuid not null unique,
 display_name text not null check(length(display_name) between 1 and 50),
 rating integer not null check(rating between 1 and 5),
 body text not null check(length(body) between 10 and 1000),
 approved boolean not null default false,
 created_at timestamptz not null default now()
);
alter table public.customer_reviews enable row level security;
create index customer_reviews_approved_created_idx on public.customer_reviews(created_at desc) where approved;
create policy "Published customer reviews" on public.customer_reviews for select to anon,authenticated using(approved);
create policy "Owner moderates reviews" on public.customer_reviews for all to authenticated
 using((select auth.uid())='e915fbd7-f087-471a-8a22-1c544ab6a263'::uuid)
 with check((select auth.uid())='e915fbd7-f087-471a-8a22-1c544ab6a263'::uuid);
revoke all on public.customer_reviews from anon,authenticated;
grant select(id,display_name,rating,body,created_at) on public.customer_reviews to anon;
grant select,update on public.customer_reviews to authenticated;

-- Private definer functions enforce the complete unguessable receipt UUID plus
-- matching phone. The public API wrappers remain SECURITY INVOKER.
create function bd_customer.order_progress(receipt_id uuid, customer_phone text)
returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('status',o.status,'pickup',o.pickup_time)
 from public.orders o where o.id=receipt_id and bd_loyalty.phone_key(customer_phone) is not null
 and bd_loyalty.phone_key(o.phone)=bd_loyalty.phone_key(customer_phone);
$$;
revoke all on function bd_customer.order_progress(uuid,text) from public;
grant execute on function bd_customer.order_progress(uuid,text) to anon,authenticated;
create function public.bd_customer_order_progress(receipt_id uuid, customer_phone text)
returns jsonb language sql stable security invoker set search_path='' as $$
 select bd_customer.order_progress(receipt_id,customer_phone);
$$;
revoke all on function public.bd_customer_order_progress(uuid,text) from public;
grant execute on function public.bd_customer_order_progress(uuid,text) to anon,authenticated;

-- Balance-only lookup: no names, receipts, purchase details, or redemption access.
create function bd_customer.rewards(customer_phone text)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare phone_key text:=bd_loyalty.phone_key(customer_phone); balance bigint;
begin
 if phone_key is null then raise exception 'Enter a valid 10-digit phone number.' using errcode='22023'; end if;
 select greatest(coalesce(sum(points),0),0) into balance from bd_loyalty.order_credits c where c.phone=phone_key;
 return jsonb_build_object('progress',balance%5,'rewards',balance/5);
end; $$;
revoke all on function bd_customer.rewards(text) from public;
grant execute on function bd_customer.rewards(text) to anon,authenticated;
create function public.bd_customer_rewards(customer_phone text)
returns jsonb language sql stable security invoker set search_path='' as $$select bd_customer.rewards(customer_phone);$$;
revoke all on function public.bd_customer_rewards(text) from public;
grant execute on function public.bd_customer_rewards(text) to anon,authenticated;

create function bd_customer.submit_review(receipt_id uuid,customer_phone text,review_name text,review_rating integer,review_body text)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.orders o where o.id=receipt_id and o.status='Completed'
   and bd_loyalty.phone_key(customer_phone) is not null
   and bd_loyalty.phone_key(o.phone)=bd_loyalty.phone_key(customer_phone)) then
  raise exception 'Use the reference and phone number from a completed pickup order.' using errcode='22023';
 end if;
 if length(trim(review_name)) not between 1 and 50 or length(trim(review_body)) not between 10 and 1000 or review_rating not between 1 and 5 or review_name is null or review_body is null or review_rating is null then
  raise exception 'Enter your name, rating, and a review of 10–1000 characters.' using errcode='22023';
 end if;
 insert into public.customer_reviews(order_id,display_name,rating,body) values(receipt_id,trim(review_name),review_rating,trim(review_body));
 return jsonb_build_object('submitted',true);
exception when unique_violation then
 raise exception 'A review has already been submitted for this order.' using errcode='22023';
end; $$;
revoke all on function bd_customer.submit_review(uuid,text,text,integer,text) from public;
grant execute on function bd_customer.submit_review(uuid,text,text,integer,text) to anon,authenticated;
create function public.bd_submit_customer_review(receipt_id uuid,customer_phone text,review_name text,review_rating integer,review_body text)
returns jsonb language sql security invoker set search_path='' as $$select bd_customer.submit_review(receipt_id,customer_phone,review_name,review_rating,review_body);$$;
revoke all on function public.bd_submit_customer_review(uuid,text,text,integer,text) from public;
grant execute on function public.bd_submit_customer_review(uuid,text,text,integer,text) to anon,authenticated;
