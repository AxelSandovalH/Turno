-- =============================================================================
-- CUSTOM STAFF ROLES — cada tenant define sus propias etiquetas de staff
-- (recepcionista, terapeuta, masajista, gerente, etc.) en vez de un enum fijo.
-- =============================================================================

-- 'owner' deja de ser un valor de rol reservado; pasa a ser un flag propio
-- para no colisionar con las etiquetas libres que cada tenant va a crear.
alter table staff add column is_owner boolean not null default false;
update staff set is_owner = true where role = 'owner';

-- staff.role pasa de enum fijo a texto libre
alter table staff alter column role drop default;
alter table staff alter column role type text using role::text;
alter table staff alter column role set default 'Staff';

drop type if exists staff_role;

-- Catálogo de etiquetas por organización — lo que el tenant ve en el selector
-- y puede ampliar libremente. Los nombres de columna calzan con el patrón de
-- otras tablas del proyecto (org-scoped + RLS por organization_id).
create table staff_roles (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  label           text not null,
  created_at      timestamptz not null default now(),
  unique (organization_id, label)
);

comment on table staff_roles is 'Etiquetas de staff personalizables por tenant (recepcionista, terapeuta, masajista, gerente, etc.)';

alter table staff_roles enable row level security;

create policy "staff_roles_all" on staff_roles
  for all using (organization_id = public.current_organization_id());

-- Sembrar cada organización existente con las etiquetas que ya está usando en
-- staff.role, para que nada quede huérfano después de la migración.
insert into staff_roles (organization_id, label)
select distinct organization_id, role
from staff
where role is not null and trim(role) <> ''
on conflict (organization_id, label) do nothing;
