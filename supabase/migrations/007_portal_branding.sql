-- Etapa 5: portal del paciente y booking page

alter table customers
  add column if not exists portal_token text unique default null;

alter table organizations
  add column if not exists logo_url text default null,
  add column if not exists primary_color text default null;

comment on column customers.portal_token is 'Token único para acceso al portal personal del paciente (URL pública)';
comment on column organizations.logo_url is 'URL del logo del negocio para la booking page pública';
comment on column organizations.primary_color is 'Color principal del negocio en hex (ej. #7c3aed) para la booking page';
