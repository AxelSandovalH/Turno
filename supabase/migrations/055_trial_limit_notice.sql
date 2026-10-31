-- Aviso único al dueño cuando se acaban los mensajes de la prueba gratis del Asistente.
alter table organizations add column if not exists trial_limit_notified_at timestamptz;
