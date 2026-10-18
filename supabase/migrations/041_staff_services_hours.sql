-- Horario propio de un servicio para un profesional: p. ej. IV therapy solo de 18:00 a 23:00 mientras que su
-- video consulta sigue el horario normal del profesional. Vacío = todo su horario. Requiere la migración 039.
alter table staff_services add column if not exists window_start time;
alter table staff_services add column if not exists window_end time;
