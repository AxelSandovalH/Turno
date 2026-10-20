-- Interruptor para apagar el catálogo en línea: la página pública de pedidos y el bot dejan de mostrar y vender productos.
alter table organizations add column if not exists catalog_enabled boolean not null default true;
