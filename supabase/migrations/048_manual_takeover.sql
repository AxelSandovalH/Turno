-- Cuando una persona escribe a mano en un chat, el bot se calla en ese chat por unas horas (o hasta que la persona escriba /bot).
alter table conversations add column if not exists bot_paused_until timestamptz;
alter table organizations add column if not exists bot_pause_hours int not null default 6;
-- Registro corto de lo que ENVÍA el sistema, para distinguir sus mensajes de los que escribe una persona
create table if not exists outbound_log (
  id         bigint generated always as identity primary key,
  instance   text not null,
  to_phone   text not null,
  body_hash  text not null,
  created_at timestamptz not null default now()
);
create index if not exists outbound_log_lookup on outbound_log (instance, to_phone, created_at desc);
alter table outbound_log enable row level security;
