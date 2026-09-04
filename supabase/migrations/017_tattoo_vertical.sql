-- Agrega el giro "tattoo" (estudio de tatuajes) al enum business_type.
-- Perfil basado en citas, igual que barbería/spa/charter (ver lib/profiles/tattoo.ts):
-- reservas por WhatsApp, página pública y anticipo obligatorio (clave para
-- asegurar la sesión, que suele ser larga y de precio alto).
alter type business_type add value if not exists 'tattoo';
