-- La línea de ventas es una instancia APARTADA: la reserva automática no se la reparte a ningún negocio.
alter table whatsapp_instances add column if not exists reserved_for text;

-- Lo que ventas ya usa se aparta (por si había quedado "libre" en la reserva)
update whatsapp_instances set reserved_for = 'sales', organization_id = null, assigned_at = null
where instance_id in (select ultramsg_instance from sales_config where ultramsg_instance is not null);

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
  where w.organization_id is null and w.reserved_for is null
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
