-- ════════════════════════════════════════════════════════════════════════
--  Shreya's Kitchen — database schema
--  Run once in the Supabase SQL editor (or `supabase db push`).
--  Safe to re-run: every statement is idempotent.
--
--  Money is stored in PAISE (integer). Never use float for currency.
-- ════════════════════════════════════════════════════════════════════════

create extension if not exists "pgcrypto";

-- ── Customers ───────────────────────────────────────────────────────────
create table if not exists customers (
  id           uuid primary key default gen_random_uuid(),
  phone        text not null unique,          -- E.164, e.g. +919601050241
  name         text,
  is_blocked   boolean not null default false,
  created_at   timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

-- ── Delivery addresses ──────────────────────────────────────────────────
create table if not exists addresses (
  id          uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  label       text not null default 'Home',   -- Home / Office / Other
  contact_name text,
  line1       text not null,
  line2       text,
  landmark    text,
  city        text not null default 'Ahmedabad',
  pincode     text not null,
  is_default  boolean not null default false,
  deleted_at  timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists addresses_customer_idx on addresses(customer_id) where deleted_at is null;

-- Exactly one default address per customer.
create unique index if not exists addresses_one_default_idx
  on addresses(customer_id) where is_default and deleted_at is null;

-- ── Menu ────────────────────────────────────────────────────────────────
create table if not exists categories (
  id             uuid primary key default gen_random_uuid(),
  slug           text not null unique,
  name           text not null,
  blurb          text,
  window_label   text,                         -- "8:00 AM – 11:00 AM"
  available_from int,                          -- minutes from midnight, null = all day
  available_to   int,
  sort_order     int not null default 0,
  is_active      boolean not null default true
);

create table if not exists menu_items (
  id           uuid primary key default gen_random_uuid(),
  category_id  uuid not null references categories(id) on delete cascade,
  slug         text not null unique,
  name         text not null,
  description  text,
  note         text,                            -- "2 pcs", "No milk / sugar"
  options      text[] not null default '{}',    -- customer-selectable variants
  price_paise  int not null check (price_paise >= 0),
  is_favourite boolean not null default false,
  is_available boolean not null default true,
  sort_order   int not null default 0,
  -- Set true the moment an admin edits the price, so re-seeding never
  -- clobbers a real price with the placeholder from menu.ts.
  price_locked boolean not null default false,
  updated_at   timestamptz not null default now()
);
create index if not exists menu_items_category_idx on menu_items(category_id);

create table if not exists combos (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique,
  code         text not null,                   -- "COMBO 01"
  name         text not null,
  price_paise  int not null check (price_paise >= 0),
  window_label text,
  available_from int,
  available_to   int,
  slots        jsonb not null default '[]'::jsonb,
  is_available boolean not null default true,
  sort_order   int not null default 0,
  price_locked boolean not null default false,
  updated_at   timestamptz not null default now()
);

-- ── Orders ──────────────────────────────────────────────────────────────
do $$ begin
  create type order_status as enum (
    'pending',          -- placed, awaiting admin decision
    'accepted',
    'preparing',
    'ready',
    'out_for_delivery',
    'delivered',
    'rejected',
    'cancelled'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_method as enum ('razorpay', 'cod');
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_status as enum ('pending', 'paid', 'failed', 'refunded');
exception when duplicate_object then null; end $$;

-- Human-friendly order numbers: SK-000001, SK-000002, …
create sequence if not exists order_no_seq start 1;

create table if not exists orders (
  id              uuid primary key default gen_random_uuid(),
  order_no        text not null unique
                    default 'SK-' || lpad(nextval('order_no_seq')::text, 6, '0'),
  customer_id     uuid not null references customers(id) on delete restrict,

  status          order_status   not null default 'pending',
  payment_method  payment_method not null,
  payment_status  payment_status not null default 'pending',

  -- Address is SNAPSHOTTED at order time. Editing an address later must not
  -- rewrite where a past order went.
  address_id      uuid references addresses(id) on delete set null,
  ship_name       text,
  ship_phone      text not null,
  ship_line1      text not null,
  ship_line2      text,
  ship_landmark   text,
  ship_city       text not null,
  ship_pincode    text not null,

  subtotal_paise     int not null check (subtotal_paise >= 0),
  delivery_fee_paise int not null default 0 check (delivery_fee_paise >= 0),
  total_paise        int not null check (total_paise >= 0),

  customer_note   text,
  reject_reason   text,

  razorpay_order_id   text unique,
  razorpay_payment_id text,

  placed_at    timestamptz not null default now(),
  decided_at   timestamptz,   -- when admin accepted or rejected
  completed_at timestamptz
);
create index if not exists orders_customer_idx on orders(customer_id, placed_at desc);
create index if not exists orders_status_idx   on orders(status, placed_at desc);

create table if not exists order_items (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references orders(id) on delete cascade,
  -- 'item' or 'combo'
  kind          text not null check (kind in ('item', 'combo')),
  ref_slug      text not null,
  -- Name/price snapshotted so historical orders never change.
  name_snapshot text not null,
  detail        text,                            -- chosen option or combo contents
  unit_paise    int not null check (unit_paise >= 0),
  qty           int not null check (qty > 0),
  line_paise    int not null check (line_paise >= 0)
);
create index if not exists order_items_order_idx on order_items(order_id);

-- Append-only status timeline shown on the customer tracking page.
create table if not exists order_events (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null references orders(id) on delete cascade,
  status     order_status not null,
  note       text,
  actor      text not null default 'system',     -- 'system' | 'admin' | 'customer'
  created_at timestamptz not null default now()
);
create index if not exists order_events_order_idx on order_events(order_id, created_at);

-- ── OTP ─────────────────────────────────────────────────────────────────
create table if not exists otp_codes (
  id          uuid primary key default gen_random_uuid(),
  phone       text not null,
  code_hash   text not null,                     -- sha256(code + phone + secret)
  expires_at  timestamptz not null,
  attempts    int not null default 0,
  consumed_at timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists otp_phone_idx on otp_codes(phone, created_at desc);

-- ── Store settings (single row) ─────────────────────────────────────────
create table if not exists store_settings (
  id                 int primary key default 1 check (id = 1),
  is_accepting_orders boolean not null default true,
  closed_message     text default 'We are not taking orders right now. Please check back soon.',
  delivery_fee_paise int not null default 3000,
  free_delivery_above_paise int not null default 39900,
  updated_at         timestamptz not null default now()
);
insert into store_settings (id) values (1) on conflict (id) do nothing;

-- ── Row Level Security ──────────────────────────────────────────────────
-- Every read and write goes through Next.js route handlers using the
-- service_role key, which bypasses RLS. RLS is enabled with NO policies so
-- that the anon/public key can reach nothing, even if it ever leaks.
alter table customers      enable row level security;
alter table addresses      enable row level security;
alter table categories     enable row level security;
alter table menu_items     enable row level security;
alter table combos         enable row level security;
alter table orders         enable row level security;
alter table order_items    enable row level security;
alter table order_events   enable row level security;
alter table otp_codes      enable row level security;
alter table store_settings enable row level security;

-- ── Housekeeping ────────────────────────────────────────────────────────
-- Expired OTPs are dead weight. Call from a cron job, or ignore — the login
-- path only ever reads the newest unconsumed row.
create or replace function purge_expired_otps() returns void
language sql as $$
  delete from otp_codes where expires_at < now() - interval '1 day';
$$;
