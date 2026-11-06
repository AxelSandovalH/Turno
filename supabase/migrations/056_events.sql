-- Eventos con inscripción y pago en línea (carreras, etc.): giro 'events'.
create table if not exists events (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations(id) on delete cascade,
  slug             text not null unique,
  title            text not null,
  subtitle         text,
  description      text,
  event_date       timestamptz not null,
  location         text,
  price            numeric(10,2) not null check (price > 0),
  currency         text not null default 'mxn',
  capacity         int check (capacity is null or capacity > 0),
  image_url        text,
  is_open          boolean not null default true,
  created_at       timestamptz not null default now()
);

create table if not exists event_registrations (
  id                uuid primary key default gen_random_uuid(),
  event_id          uuid not null references events(id) on delete cascade,
  organization_id   uuid not null references organizations(id) on delete cascade,
  full_name         text not null,
  email             text,
  phone             text not null,
  birth_date        date,
  shirt_size        text,
  emergency_name    text,
  emergency_phone   text,
  status            text not null default 'pending' check (status in ('pending','paid','cancelled')),
  amount            numeric(10,2),
  stripe_session_id text,
  paid_at           timestamptz,
  created_at        timestamptz not null default now()
);
create index if not exists event_registrations_event_idx on event_registrations (event_id, status);
create index if not exists events_org_idx on events (organization_id);

alter table events enable row level security;
alter table event_registrations enable row level security;
drop policy if exists events_org on events;
create policy events_org on events for all using (organization_id = public.current_organization_id());
drop policy if exists event_registrations_org on event_registrations;
create policy event_registrations_org on event_registrations for all using (organization_id = public.current_organization_id());
