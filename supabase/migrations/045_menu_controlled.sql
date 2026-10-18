-- Medicamentos controlados (fracción I-III): se ven SOLO en el panel de la farmacia como inventario. No aparecen en la
-- página pública de pedidos, no los ve el bot y no se pueden pedir por ningún medio en línea.
alter table menu_items add column if not exists controlled boolean not null default false;
