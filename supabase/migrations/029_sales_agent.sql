-- Agente de ventas: escribe a negocios cargados por el dueño de la plataforma, se presenta,
-- resuelve dudas y negocia dentro de límites fijos. Todo es solo para el servidor (sin políticas).

create table if not exists sales_config (
  id                 int primary key default 1 check (id = 1),     -- una sola fila
  enabled            boolean not null default false,
  ultramsg_instance  text,
  ultramsg_token     text,
  owner_phone        text,                                          -- a quién se le avisa cuando hay que intervenir
  daily_limit        int  not null default 15,                      -- mensajes en frío por día (nuevos + seguimientos)
  send_start_hour    int  not null default 9,
  send_end_hour      int  not null default 18,
  timezone           text not null default 'America/Mazatlan',
  max_followups      int  not null default 2,
  followup_after_days int not null default 3,
  updated_at         timestamptz not null default now()
);
insert into sales_config (id) values (1) on conflict do nothing;

create table if not exists prospects (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,                                   -- nombre del negocio
  contact_name     text,
  phone            text not null,                                   -- 521 + 10 dígitos
  phone_key        text not null unique,                            -- últimos 10 dígitos: evita duplicados
  segment          text not null default 'other',                   -- tipo de negocio (business_type)
  city             text,
  notes            text,
  source           text,
  status           text not null default 'new'
    check (status in ('new','contacted','replied','interested','negotiating','handoff','won','lost','opted_out','invalid')),
  followups_sent   int  not null default 0,
  offer_link       text,                                            -- enlace con descuento (solo se da uno por prospecto)
  handoff_reason   text,
  first_contacted_at timestamptz,
  last_contact_at  timestamptz,
  last_inbound_at  timestamptz,
  created_at       timestamptz not null default now()
);
create index if not exists prospects_status_idx on prospects (status, created_at);

create table if not exists prospect_messages (
  id          uuid primary key default gen_random_uuid(),
  prospect_id uuid not null references prospects(id) on delete cascade,
  role        text not null check (role in ('user','assistant')),
  kind        text not null default 'chat' check (kind in ('chat','first','followup')),
  content     text not null,
  ultramsg_id text,
  created_at  timestamptz not null default now()
);
create index if not exists prospect_messages_prospect_idx on prospect_messages (prospect_id, created_at);
create index if not exists prospect_messages_sent_idx on prospect_messages (kind, created_at);

alter table sales_config      enable row level security;
alter table prospects         enable row level security;
alter table prospect_messages enable row level security;
