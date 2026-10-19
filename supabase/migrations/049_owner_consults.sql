-- Consultas del bot al responsable: el bot le pregunta a Sergio, él contesta al bot y el bot se lo comunica al cliente.
create table if not exists owner_consults (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  code            text not null,
  customer_phone  text not null,
  customer_name   text,
  reason          text not null default 'otro',
  question        text not null,
  status          text not null default 'pending' check (status in ('pending', 'answered', 'expired')),
  answer          text,
  created_at      timestamptz not null default now(),
  answered_at     timestamptz
);
create index if not exists owner_consults_org_idx on owner_consults (organization_id, status, created_at desc);
alter table owner_consults enable row level security;
