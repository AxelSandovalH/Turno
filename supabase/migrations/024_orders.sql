-- Pedidos y delivery: menú, pedidos y configuración de entrega por negocio.

-- ── Configuración de entrega y pago (por organización) ───────────────────────
alter table organizations
  add column if not exists order_delivery_enabled boolean not null default true,
  add column if not exists order_pickup_enabled   boolean not null default true,
  add column if not exists order_delivery_fee     numeric(10, 2) not null default 0,
  add column if not exists order_min_amount       numeric(10, 2) not null default 0,
  add column if not exists order_payment_info     text,           -- datos de transferencia
  add column if not exists order_accepting        boolean not null default true; -- pausar pedidos

-- ── Menú ─────────────────────────────────────────────────────────────────────
create table if not exists menu_categories (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name            text not null,
  sort_order      int  not null default 0,
  created_at      timestamptz not null default now()
);

create table if not exists menu_items (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  category_id     uuid references menu_categories(id) on delete set null,
  name            text not null,
  description     text,
  price           numeric(10, 2) not null check (price >= 0),
  image_url       text,
  -- Extras opcionales: [{"name":"Queso extra","price":15}]
  extras          jsonb not null default '[]'::jsonb,
  is_available    boolean not null default true,   -- false = agotado hoy
  sort_order      int  not null default 0,
  created_at      timestamptz not null default now()
);
create index if not exists menu_items_org_idx on menu_items (organization_id, category_id);

-- ── Pedidos ──────────────────────────────────────────────────────────────────
do $$ begin
  create type order_status as enum ('pending', 'preparing', 'on_the_way', 'delivered', 'cancelled');
exception when duplicate_object then null; end $$;

create table if not exists orders (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  order_number    bigint generated always as identity,
  customer_id     uuid references customers(id) on delete set null,
  customer_name   text not null,
  customer_phone  text not null,
  fulfillment     text not null check (fulfillment in ('delivery', 'pickup')),
  address         text,
  notes           text,
  subtotal        numeric(10, 2) not null,
  delivery_fee    numeric(10, 2) not null default 0,
  total           numeric(10, 2) not null,
  payment_method  text not null check (payment_method in ('cash', 'transfer')),
  status          order_status not null default 'pending',
  source          text not null default 'web' check (source in ('web', 'whatsapp')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists orders_org_status_idx on orders (organization_id, status, created_at desc);

create table if not exists order_items (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references orders(id) on delete cascade,
  menu_item_id uuid references menu_items(id) on delete set null,
  name         text not null,
  unit_price   numeric(10, 2) not null,   -- precio base + extras, congelado al pedir
  quantity     int not null check (quantity > 0),
  extras       jsonb not null default '[]'::jsonb,
  notes        text
);
create index if not exists order_items_order_idx on order_items (order_id);

-- ── RLS: el dueño ve y edita lo suyo; la web pública y el bot usan service role
alter table menu_categories enable row level security;
alter table menu_items      enable row level security;
alter table orders          enable row level security;
alter table order_items     enable row level security;

create policy "menu_categories_all" on menu_categories
  for all using (organization_id = public.current_organization_id());
create policy "menu_items_all" on menu_items
  for all using (organization_id = public.current_organization_id());
create policy "orders_select" on orders
  for select using (organization_id = public.current_organization_id());
create policy "orders_update" on orders
  for update using (organization_id = public.current_organization_id());
create policy "order_items_select" on order_items
  for select using (exists (
    select 1 from orders o where o.id = order_items.order_id
      and o.organization_id = public.current_organization_id()));
