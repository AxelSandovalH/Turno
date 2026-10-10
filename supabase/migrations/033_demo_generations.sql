-- Límite de uso del generador de demos de la landing: por visitante (hash de IP) y por día, más un contador global.
create table if not exists demo_generations (
  ip_hash text not null,
  day date not null,
  count int not null default 0,
  primary key (ip_hash, day)
);
alter table demo_generations enable row level security;
