-- Cuando el bot le pasa un cliente al responsable (receta, controlados, urgencias), se anota para no avisarle dos veces seguidas.
alter table conversations add column if not exists handoff_at timestamptz;
