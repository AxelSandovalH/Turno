-- La instancia UltraMsg del fundador es un único número de WhatsApp físico
-- compartido por las orgs que aún no tienen su propia instancia dedicada.
-- Antes se resolvía por "ultramsg_instance IS NULL", pero eso es ambiguo en
-- cuanto hay más de una org sin instancia propia (hoy hay 7) — el webhook
-- no puede saber a cuál pertenece el mensaje entrante y deja de responder.
--
-- Esta bandera marca explícitamente cuál org está usando el número
-- compartido en un momento dado. El índice único impide que dos orgs la
-- tengan activa a la vez. Para reasignar el número a otra org: desactivar
-- la bandera en la org actual y activarla en la nueva.

alter table public.organizations
  add column if not exists is_founder_fallback boolean not null default false;

comment on column public.organizations.is_founder_fallback is
  'Marca la única org que usa el número/instancia UltraMsg compartida del fundador (sin ultramsg_instance propio). Debe haber a lo más una en true.';

create unique index if not exists organizations_founder_fallback_unique
  on public.organizations (is_founder_fallback)
  where is_founder_fallback = true;

update public.organizations
  set is_founder_fallback = true
  where id = '05ea8a37-0d77-4ab5-8e74-e47c90490527'; -- Pie Dicarino
