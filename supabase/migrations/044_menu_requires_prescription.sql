-- Productos que requieren receta médica: se muestran en el catálogo pero NO se pueden agregar al carrito ni pedir
-- por el bot como compra directa; los atiende una persona que verifica la receta.
alter table menu_items add column if not exists requires_prescription boolean not null default false;
