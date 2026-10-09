-- Agrega el giro "restaurant" (restaurantes, taquerías, cafeterías, comida
-- rápida) al enum business_type. Perfil de pedidos y delivery, sin citas
-- (ver lib/profiles/restaurant.ts). Corre este archivo solo, antes del 024.
alter type business_type add value if not exists 'restaurant';
