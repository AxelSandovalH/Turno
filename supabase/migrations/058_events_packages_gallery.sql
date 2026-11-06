-- Paquetes de inscripción (varios precios) y galería de fotos por evento.
alter table events add column if not exists packages jsonb not null default '[]'::jsonb;
alter table events add column if not exists gallery  jsonb not null default '[]'::jsonb;
alter table events add column if not exists organizer text;
alter table event_registrations add column if not exists package_name text;
