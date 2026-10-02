-- Agrega el giro "consulting" (consultoría / servicios profesionales) al enum
-- business_type. Perfil basado en citas, igual que barbería/charter/tattoo
-- (ver lib/profiles/consulting.ts): agenda de llamadas/sesiones por WhatsApp
-- y página de reservas, sin expediente clínico ni comisiones.
alter type business_type add value if not exists 'consulting';
