-- Horarios: permite varios bloques por día (migración 020, por si no se corrió) y asegura la columna que
-- el panel envía al guardar un horario. Seguro de correr más de una vez.
alter table staff_schedules drop constraint if exists staff_schedules_staff_id_day_of_week_key;
alter table staff_schedules add column if not exists organization_id uuid references organizations(id) on delete cascade;
update staff_schedules ss set organization_id = s.organization_id from staff s where s.id = ss.staff_id and ss.organization_id is null;
