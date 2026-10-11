-- Asegura que el enum business_type tenga TODOS los giros que ofrece el registro y la demo de la landing.
-- Es idempotente: si el valor ya existe no hace nada. (Las migraciones de cada giro agregaban su valor, pero
-- si alguna no se corrió en producción, registrar ese giro fallaba con "invalid input value for enum".)
-- Correr cada línea por separado si el editor lo pide.
alter type business_type add value if not exists 'spa';
alter type business_type add value if not exists 'laboratory';
alter type business_type add value if not exists 'charter';
alter type business_type add value if not exists 'tattoo';
alter type business_type add value if not exists 'consulting';
alter type business_type add value if not exists 'tours';
alter type business_type add value if not exists 'restaurant';
