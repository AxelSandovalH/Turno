-- Deja listos los servicios y el horario de la farmacia (Cabo Pharmacy, enlace cabo-pharmacy).
-- Correr DESPUÉS de la migración 036 y de registrar la cuenta. Se puede correr más de una vez sin duplicar.
-- Los servicios entran como BORRADOR (inactivos) y con precio 0: pon precio y duración reales en Servicios
-- y actívalos; mientras estén inactivos no aparecen en la página de reservas ni el bot los ofrece.
do $$
declare
  v_org   uuid;
  v_staff uuid;
begin
  select id into v_org from organizations where slug = 'cabo-pharmacy' and business_type = 'pharmacy' limit 1;
  if v_org is null then raise exception 'No existe el negocio cabo-pharmacy con giro farmacia: registra primero la cuenta'; end if;

  insert into services (organization_id, name, description, duration_minutes, price, is_active)
  select v_org, s.name, s.descr, s.mins, 0, false
  from (values
    ('Consulta médica',            'Consulta en el consultorio médico.',                       30),
    ('IV therapy en consultorio',  'Terapia intravenosa aplicada en el consultorio.',          60),
    ('IV therapy a domicilio',     'Terapia intravenosa aplicada en el domicilio del cliente.', 90)
  ) as s(name, descr, mins)
  where not exists (select 1 from services x where x.organization_id = v_org and x.name = s.name);

  -- Horario del consultorio: todos los días de 9:00 a 23:00 para el dueño (se puede ajustar en Horarios)
  select id into v_staff from staff where organization_id = v_org and is_owner limit 1;
  if v_staff is null then select id into v_staff from staff where organization_id = v_org order by created_at limit 1; end if;
  if v_staff is not null then
    insert into staff_schedules (staff_id, day_of_week, start_time, end_time, is_working)
    select v_staff, d, '09:00', '23:00', true from generate_series(0, 6) d
    on conflict (staff_id, day_of_week) do nothing;
  end if;
end $$;
