-- Agrega el giro "laboratory" (laboratorio clínico) al enum business_type.
-- Perfil sin motor de citas: su flujo central son órdenes de laboratorio
-- (ver lib/profiles/laboratory.ts). Las tablas lab_* llegan en la migración 013.
alter type business_type add value if not exists 'laboratory';
