-- Cuenta de Clip propia de un negocio (las inscripciones a sus eventos se cobran directo a su cuenta).
-- Las llaves se guardan CIFRADAS (ver lib/secrets.ts). Solo el servidor las lee: RLS activado y sin políticas.
create table if not exists org_clip_accounts (
  organization_id uuid primary key references organizations(id) on delete cascade,
  api_key_enc     text not null,
  api_secret_enc  text not null,
  livemode        boolean not null default false,
  updated_at      timestamptz not null default now()
);
alter table org_clip_accounts enable row level security;

-- ID del link de pago de Clip (payment_request_id) para reconocer el webhook
alter table event_registrations add column if not exists clip_payment_id text;
create index if not exists event_registrations_clip_payment_id_idx on event_registrations (clip_payment_id) where clip_payment_id is not null;
