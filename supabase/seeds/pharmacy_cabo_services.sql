-- Servicios con precio fijo y agenda de Cabo Pharmacy (USD). Los demás servicios y experiencias se cotizan por chat.
-- Se puede correr más de una vez: solo agrega los que no existan por nombre.
do $$
declare v_org uuid;
begin
  select id into v_org from organizations where slug = 'cabo-pharmacy' and business_type = 'pharmacy' limit 1;
  if v_org is null then raise exception 'No existe el negocio cabo-pharmacy'; end if;

  insert into services (organization_id, name, description, duration_minutes, price, is_active)
  select v_org, s.name, s.descr, s.mins, s.price, true
  from (values
    ('Doctor at Your Villa',      'El médico evalúa, diagnostica y trata en tu ubicación (villa u hotel).', 60, 200),
    ('Labs & Rapid Testing',      'Toma de muestras y pruebas rápidas en tu villa u hotel.',                30,  59),
    ('Wound Care',                'Curaciones y cuidado post-operatorio en tu ubicación.',                  45, 149)
  ) as s(name, descr, mins, price)
  where not exists (select 1 from services x where x.organization_id = v_org and x.name = s.name);
end $$;
