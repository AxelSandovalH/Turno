-- Links de pago pedidos por el bot: el cliente nunca recibe el link hasta que el dueño lo aprueba por WhatsApp.
create table if not exists payment_link_requests (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  code            text not null,                         -- 4 dígitos que el dueño escribe para aprobar o rechazar
  customer_phone  text not null,
  customer_name   text,
  amount          numeric(10, 2) not null check (amount > 0),
  description     text not null,
  status          text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'expired', 'paid')),
  checkout_url    text,
  checkout_session_id text,
  created_at      timestamptz not null default now(),
  decided_at      timestamptz,
  paid_at         timestamptz
);
create index if not exists payment_link_requests_org_idx on payment_link_requests (organization_id, status, created_at desc);
alter table payment_link_requests enable row level security;
