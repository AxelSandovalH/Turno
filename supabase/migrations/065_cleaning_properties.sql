-- Propiedades por anfitrión y hora límite de entrega (giro 'cleaning'). Solo agrega: no cambia datos existentes.
create table if not exists properties (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  customer_id     uuid not null references custome  rs(id) on delete cascade,
  name            text not null,
  zone            text,
  notes           text,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  unique (customer_id, name)
);
create index if not exists properties_org_idx on properties (organization_id, is_active);
alter table properties enable row level security;
drop policy if exists properties_org on properties;
create policy properties_org on properties for all
  using (organization_id = public.current_organization_id())
  with check (organization_id = public.current_organization_id());

alter table appointments add column if not exists property_id uuid references properties(id) on delete set null;
alter table appointments add column if not exists deadline_at timestamptz;

-- Link personal del anfitrión: /book/<negocio>?h=<token> le muestra sus propiedades
alter table customers add column if not exists booking_token text;
create unique index if not exists customers_booking_token_idx on customers (booking_token) where booking_token is not null;
