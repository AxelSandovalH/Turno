-- Agrega el giro "charter" (charter de yates / pesca) al enum business_type.
-- Perfil basado en citas, igual que barbería/spa (ver lib/profiles/charter.ts):
-- reservas por WhatsApp, página pública y anticipos por Stripe.
alter type business_type add value if not exists 'charter';
