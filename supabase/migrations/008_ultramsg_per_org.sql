-- Multi-tenant WhatsApp: cada organización tiene su propia instancia de UltraMsg.
-- El webhook rutea por instance_id; las orgs sin credenciales usan las env vars
-- globales como fallback (instancia fundadora).

alter table public.organizations
  add column if not exists ultramsg_instance text unique,
  add column if not exists ultramsg_token text;

comment on column public.organizations.ultramsg_instance is
  'ID de instancia UltraMsg (ej. instance123456). Llega como instanceId en el webhook.';
comment on column public.organizations.ultramsg_token is
  'Token de la instancia UltraMsg para enviar mensajes.';
