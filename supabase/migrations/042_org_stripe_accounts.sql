-- Cuenta de Stripe propia de un negocio (cobros de pedidos y anticipos van directo a su cuenta).
-- Las llaves se guardan CIFRADAS (ver lib/secrets.ts). Solo el servidor las lee: RLS activado y sin políticas.
create table if not exists org_stripe_accounts (
  organization_id    uuid primary key references organizations(id) on delete cascade,
  secret_key_enc     text not null,
  webhook_secret_enc text not null,
  livemode           boolean not null default false,
  updated_at         timestamptz not null default now()
);
alter table org_stripe_accounts enable row level security;
