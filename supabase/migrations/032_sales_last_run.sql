-- Diagnóstico: qué pasó en la última pasada automática (cron) del agente de ventas
alter table sales_config add column if not exists last_run_at timestamptz;
alter table sales_config add column if not exists last_run_result text;
