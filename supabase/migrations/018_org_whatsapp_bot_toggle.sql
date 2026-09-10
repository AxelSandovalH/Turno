-- Apagador por organización del bot de WhatsApp.
-- Algunos clientes contratan solo la agenda/booking page (pago único) sin el
-- bot; con el flag apagado se ocultan Conversaciones, el probador del bot,
-- los mensajes del bot en Configuración y el webhook ignora sus mensajes.
alter table organizations
  add column if not exists whatsapp_bot_enabled boolean not null default true;

comment on column organizations.whatsapp_bot_enabled is
  'Si es false, la org no usa el bot de WhatsApp: se oculta toda su UI y el webhook no responde.';
