-- Donaciones: un registro puede ser de corredor ('race') o solo donación ('donation'); los corredores pueden sumar un extra.
alter table event_registrations add column if not exists kind text not null default 'race' check (kind in ('race','donation'));
alter table event_registrations add column if not exists donation_amount numeric(10,2) not null default 0;
