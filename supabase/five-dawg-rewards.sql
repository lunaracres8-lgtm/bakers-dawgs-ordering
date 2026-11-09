create schema if not exists bd_loyalty;
revoke all on schema bd_loyalty from public, anon, authenticated;
grant usage on schema bd_loyalty to authenticated;

create table bd_loyalty.order_credits (
  order_id uuid primary key,
  phone text not null,
  points integer not null
);
alter table bd_loyalty.order_credits enable row level security;
revoke all on bd_loyalty.order_credits from public, anon, authenticated;
create index order_credits_phone_idx on bd_loyalty.order_credits (phone);

create function bd_loyalty.phone_key(value text)
returns text language sql immutable set search_path = '' as $$
  select case
    when digits ~ '^[0-9]{10}$' then digits
    when digits ~ '^1[0-9]{10}$' then substr(digits, 2)
  end
  from (select regexp_replace(coalesce(value, ''), '[^0-9]', '', 'g') as digits) normalized;
$$;

create function bd_loyalty.points_for_phone(value text)
returns bigint language plpgsql stable security definer set search_path = '' as $$
declare
  phone_key text := bd_loyalty.phone_key(value);
begin
  if auth.uid() is distinct from 'e915fbd7-f087-471a-8a22-1c544ab6a263'::uuid then
    raise insufficient_privilege;
  end if;
  if phone_key is null then
    raise exception 'Enter a 10-digit phone number.' using errcode = '22023';
  end if;
  return (select coalesce(sum(points), 0) from bd_loyalty.order_credits where phone = phone_key);
end;
$$;
revoke all on function bd_loyalty.points_for_phone(text) from public, anon, authenticated;
grant execute on function bd_loyalty.points_for_phone(text) to authenticated;

create function public.bd_loyalty_status(customer_phone text)
returns jsonb language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object('progress', balance % 5, 'rewards', balance / 5)
  from (select greatest(bd_loyalty.points_for_phone(customer_phone), 0) as balance) points;
$$;
revoke all on function public.bd_loyalty_status(text) from public, anon, authenticated;
grant execute on function public.bd_loyalty_status(text) to authenticated;

create function bd_loyalty.record_order()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  previous_phone text;
  current_phone text;
  locked_phone text;
  paid_dogs integer := 0;
  reward_lines integer := 0;
  valid_reward boolean := false;
  points_before bigint;
begin
  if tg_op <> 'INSERT' then
    select phone into previous_phone from bd_loyalty.order_credits where order_id = old.id;
  end if;
  if tg_op <> 'DELETE' then
    -- Customer inserts remain eligible for pickup but cannot request a staff comp.
    if jsonb_typeof(new.items) = 'array' then
      select count(*), coalesce(bool_and(line->>'quantity' = '1' and line->>'price' = '0'), false)
      into reward_lines, valid_reward
      from jsonb_array_elements(new.items) as line
      where line->>'name' = 'Free Hot Dawg (Loyalty)';
    end if;
    if reward_lines > 0 and (
      auth.uid() is distinct from 'e915fbd7-f087-471a-8a22-1c544ab6a263'::uuid
      or reward_lines <> 1 or not valid_reward
      or bd_loyalty.phone_key(new.phone) is null
    ) then
      raise exception 'Invalid loyalty redemption.' using errcode = '23514';
    end if;

    if new.status = 'Completed' then
      current_phone := bd_loyalty.phone_key(new.phone);
      if current_phone is not null and new.payment_method is not null and new.total > 0
        and jsonb_typeof(new.items) = 'array' then
        select coalesce(sum(case
          when line->>'quantity' is null then 1
          when line->>'quantity' ~ '^[1-9][0-9]{0,2}$' then (line->>'quantity')::integer
          else 0 end), 0)
        into paid_dogs
        from jsonb_array_elements(new.items) as line
        where (case when line->>'price' ~ '^[0-9]{1,8}([.][0-9]{1,4})?$'
          then (line->>'price')::numeric else 0 end) > 0
        and exists (
          select 1 from public.menu_items as item
          where item.category in ('Hot Dawgs', 'Hot Dawg Combos')
            and lower(item.item_name) = lower(line->>'name')
        );
      end if;
    end if;
  end if;

  if previous_phone is null and paid_dogs = 0 and (current_phone is null or reward_lines = 0) then
    return null;
  end if;

  -- Serialize changes to the same phone across tills. A sorted lock order also
  -- handles corrections that move a completed order to a different phone.
  for locked_phone in
    select distinct phone from unnest(array[previous_phone, current_phone]) as t(phone)
    where phone is not null order by phone
  loop
    perform pg_advisory_xact_lock(248503, hashtext(locked_phone));
  end loop;

  if tg_op <> 'INSERT' then
    delete from bd_loyalty.order_credits where order_id = old.id;
  end if;
  if current_phone is null then
    return null;
  end if;

  if reward_lines > 0 then
    select coalesce(sum(points), 0) into points_before
    from bd_loyalty.order_credits where phone = current_phone;
    if points_before + paid_dogs < 5 then
      raise exception 'No free hot dog is available for this phone number.' using errcode = '23514';
    end if;
  end if;
  if paid_dogs > 0 or reward_lines > 0 then
    insert into bd_loyalty.order_credits (order_id, phone, points)
    values (new.id, current_phone, paid_dogs - reward_lines * 5);
  end if;
  return null;
end;
$$;
revoke all on function bd_loyalty.record_order() from public, anon, authenticated;

create trigger bd_loyalty_record_order
after insert or update of phone, items, status, payment_method, total or delete on public.orders
for each row execute function bd_loyalty.record_order();
