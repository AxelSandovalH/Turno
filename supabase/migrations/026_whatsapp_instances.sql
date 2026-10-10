-- Conexión de WhatsApp por código QR: reserva de instancias de UltraMsg que se
-- asignan solas a cada negocio, y registro de cuándo quedó conectado.

create table if not exists whatsapp_instances (
  id              uuid primary key default gen_random_uuid(),
  instance_id     text not null unique,        -- ej. instance173093 (como lo pide la API de UltraMsg)
  token           text not null,
  organization_id uuid unique references organizations(id) on delete set null,
  assigned_at     timestamptz,
  created_at      timestamptz not null default now()
);

-- Contiene tokens: solo el service role (el servidor) puede leerla
alter table whatsapp_instances enable row level security;

alter table organizations
  add column if not exists whatsapp_connected_at timestamptz;

-- Los negocios que ya tienen instancia se consideran conectados
update organizations set whatsapp_connected_at = now()
where ultramsg_instance is not null and whatsapp_connected_at is null;

-- Asigna una instancia libre a un negocio. skip locked evita que dos negocios
-- nuevos reciban la misma aunque se registren al mismo tiempo.
create or replace function claim_whatsapp_instance(p_org uuid)
returns table (instance_id text, token text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  select w.id into v_id
  from whatsapp_instances w
  where w.organization_id is null
  order by w.created_at
  limit 1
  for update skip locked;

  if v_id is null then
    return;
  end if;

  update whatsapp_instances set organization_id = p_org, assigned_at = now() where id = v_id;

  return query select w.instance_id, w.token from whatsapp_instances w where w.id = v_id;
end;
$$;

revoke all on function claim_whatsapp_instance(uuid) from public, anon, authenticated;
grant execute on function claim_whatsapp_instance(uuid) to service_role;
