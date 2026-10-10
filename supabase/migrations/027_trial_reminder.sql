-- Aviso por correo antes de que termine la prueba gratis: se manda una sola vez.
alter table organizations add column if not exists trial_reminder_sent_at timestamptz;
