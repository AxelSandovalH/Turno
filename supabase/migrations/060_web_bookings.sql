-- Reservas pagadas desde los sitios web del negocio (Stripe checkout del sitio). Pueden venir sin fecha y sin teléfono,
-- por eso no usan la tabla appointments: quedan como "pendiente de agendar" hasta que el negocio las atiende.
create table if not exists web_bookings (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references organizations(id) on delete cascade,
  source            text not null,                         -- sitio de origen, p. ej. cabowalkinclinic
  payment_ref       text not null,                         -- payment_intent de Stripe: evita duplicados si Stripe reintenta
  service_name      text not null,
  customer_name     text,
  customer_phone    text,
  customer_email    text,
  booking_date      date,
  booking_time      text,                                  -- 'HH:MM' o 'ASAP'
  location          text,
  notes             text,
  currency          text not null default 'usd',
  paid_amount       numeric(10,2) not null default 0,
  total_amount      numeric(10,2),
  stripe_url        text,
  status            text not null default 'pending' check (status in ('pending','scheduled','done','cancelled')),
  created_at        timestamptz not null default now(),
  unique (organization_id, payment_ref)
);
create index if not exists web_bookings_org_idx on web_bookings (organization_id, status, created_at desc);
alter table web_bookings enable row level security;
drop policy if exists web_bookings_org on web_bookings;
create policy web_bookings_org on web_bookings for all using (organization_id = public.current_organization_id());
