create table bd_loyalty.birthday_redemptions (
  order_id uuid primary key references public.orders(id) on delete cascade,
  phone text not null,
  redeemed_on date not null,
  unique (phone, redeemed_on)
);
alter table bd_loyalty.birthday_redemptions enable row level security;
revoke all on bd_loyalty.birthday_redemptions from public, anon, authenticated;

create function bd_loyalty.record_birthday_redemption()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  customer_phone text := bd_loyalty.phone_key(new.phone);
  existing_phone text;
  reward_count integer := 0;
  valid_reward boolean := false;
begin
  if tg_op = 'UPDATE' then
    select phone into existing_phone
    from bd_loyalty.birthday_redemptions where order_id = new.id;
  end if;

  if jsonb_typeof(new.items) = 'array' then
    select count(*), coalesce(bool_and(line->>'quantity' = '1' and line->>'price' = '0'), false)
    into reward_count, valid_reward
    from jsonb_array_elements(new.items) as line
    where line->>'name' = 'Free Hot Dawg (Birthday)';
  end if;

  if reward_count = 0 or (new.status = 'Voided' and existing_phone is not null) then
    if existing_phone is not null then
      delete from bd_loyalty.birthday_redemptions where order_id = new.id;
    end if;
    return null;
  end if;

  -- Preserve voided ticket details on later edits without restoring the claim.
  if tg_op = 'UPDATE' and new.status = 'Voided' and old.status = 'Voided'
      and new.items is not distinct from old.items then
    return null;
  end if;

  -- The existing orders policies grant authenticated writes only to the owner.
  -- The role check also rejects a reward line submitted via public checkout.
  if auth.uid() is null or reward_count <> 1 or not valid_reward
      or customer_phone is null or new.status is distinct from 'Completed' then
    raise exception 'Invalid birthday redemption.' using errcode = '23514';
  end if;

  if tg_op = 'UPDATE' then
    if existing_phone is distinct from customer_phone then
      raise exception 'Use a new window sale to redeem a birthday hot dog.' using errcode = '23514';
    end if;
    return null;
  end if;

  insert into bd_loyalty.birthday_redemptions (order_id, phone, redeemed_on)
  values (new.id, customer_phone, (statement_timestamp() at time zone 'America/New_York')::date)
  on conflict (phone, redeemed_on) do nothing;

  if not found then
    raise exception 'A birthday hot dog was already redeemed today for this phone number.' using errcode = '23514';
  end if;
  return null;
end;
$$;
revoke all on function bd_loyalty.record_birthday_redemption() from public, anon, authenticated;

create trigger bd_loyalty_record_birthday_redemption
after insert or update of phone, items, status on public.orders
for each row execute function bd_loyalty.record_birthday_redemption();
