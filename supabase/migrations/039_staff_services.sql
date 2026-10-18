-- Qué servicios puede hacer cada profesional. Un profesional SIN filas aquí puede hacer todos los servicios
-- (así nada cambia para los negocios que no lo configuren).
create table if not exists staff_services (
  staff_id   uuid not null references staff(id) on delete cascade,
  service_id uuid not null references services(id) on delete cascade,
  primary key (staff_id, service_id)
);
create index if not exists staff_services_service_idx on staff_services (service_id);
alter table staff_services enable row level security;
create policy "staff_services_all" on staff_services
  for all using (staff_id in (select id from staff where organization_id = public.current_organization_id()))
  with check (staff_id in (select id from staff where organization_id = public.current_organization_id()));
