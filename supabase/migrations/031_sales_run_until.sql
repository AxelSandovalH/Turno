-- Encendido con duración: el agente escribe 24/7 mientras esté encendido y se apaga solo al llegar a run_until (null = hasta apagarlo).
alter table sales_config add column if not exists run_until timestamptz;
