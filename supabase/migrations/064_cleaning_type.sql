-- Giro 'cleaning' (limpieza de propiedades de renta). Correr SOLA, antes de la 065 y del seed:
-- un valor nuevo del enum no se puede usar en la misma transacción.
alter type business_type add value if not exists 'cleaning';
