-- Interruptor aparte para contestar a quien escribe a la línea de ventas (p. ej. desde anuncios).
-- 'enabled' sigue controlando solo el envío automático a prospectos (salir a buscar).
alter table sales_config add column if not exists inbound_enabled boolean not null default true;
