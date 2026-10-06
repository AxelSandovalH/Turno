-- Agrega el giro "tours" (operadores de tours y actividades) al enum
-- business_type. Perfil basado en citas con fotos por servicio (ver
-- lib/profiles/tours.ts).
alter type business_type add value if not exists 'tours';
