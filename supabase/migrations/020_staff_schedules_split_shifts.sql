-- Permite horario partido: más de un bloque por staff y día (ej. 10:00-13:00
-- y 17:00-19:00). El motor de disponibilidad (app/api/booking/slots,
-- lib/agent/tool-handlers get_available_slots) ya soporta varios bloques por
-- día; lo único que lo impedía era esta restricción única de la migración 001.
alter table staff_schedules drop constraint if exists staff_schedules_staff_id_day_of_week_key;
