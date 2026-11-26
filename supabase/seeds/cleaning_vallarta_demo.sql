-- DEMO "Limpieza Vallarta Express" (giro cleaning). Todo es ficticio.
-- Antes: correr 064 (sola) y 065. Después:
-- 1) Regístrate en /register con el correo de v_email (cualquier giro; el script lo cambia).
-- 2) Corre este script. Se puede repetir: borra y vuelve a crear SOLO los datos de este negocio, con fechas a partir de hoy.
-- Para cambiar el nombre, edita v_name. Las credenciales de WhatsApp son falsas a propósito: así no sale ningún mensaje.
do $$
declare
  v_email text := 'limpiezavallarta@quickturno.app';
  v_name  text := 'Limpieza Vallarta Express';
  v_slug  text := 'limpieza-vallarta-express';
  tz      text := 'America/Mexico_City';
  v_org uuid; v_cur_slug text; v_today date;
  v_staff uuid[] := '{}'; v_svc uuid[] := '{}'; v_prop uuid[] := '{}';
  v_dur int[] := array[120, 240, 90, 30, 60];
  r record; v_id uuid; d int; s int; p int; k int; v_day date; v_start time; v_end time;
  v_from timestamptz; v_to timestamptz; v_deadline timestamptz; v_past boolean;
begin
  select (u.raw_user_meta_data->>'organization_id')::uuid into v_org from auth.users u where lower(u.email) = lower(v_email);
  if v_org is null then raise exception 'Ese correo aún no se registra (%)', v_email; end if;

  -- Candado: nunca borrar datos de un negocio que no sea esta demo
  select slug into v_cur_slug from public.organizations where id = v_org;
  if v_cur_slug <> v_slug and exists (select 1 from public.appointments where organization_id = v_org) then
    raise exception 'El negocio % ya tiene citas y no es la demo: no se toca', v_cur_slug;
  end if;

  update public.organizations set
    name = v_name, slug = v_slug, business_type = 'cleaning', timezone = tz,
    subscription_status = 'active', is_active = true, whatsapp_bot_enabled = false,
    whatsapp_number = '520000000099', ultramsg_instance = 'instance000000-demo', ultramsg_token = 'demo-sin-envio',
    deposit_enabled = false, currency = 'mxn',
    logo_url = 'https://www.quickturno.app/demo/limpieza-vallarta-logo.png'
  where id = v_org;

  delete from public.appointments where organization_id = v_org;
  delete from public.properties where organization_id = v_org;
  delete from public.customers where organization_id = v_org;
  delete from public.services where organization_id = v_org;
  delete from public.staff where organization_id = v_org and not is_owner;
  update public.staff set is_active = false where organization_id = v_org;

  -- Servicios de ejemplo (precios de ejemplo, por confirmar)
  for r in select * from (values
      (1, 'Limpieza de salida (check-out)', 120, 650),
      (2, 'Limpieza profunda', 240, 1400),
      (3, 'Cambio de blancos y lavandería', 90, 350),
      (4, 'Revisión e inventario de insumos', 30, 200),
      (5, 'Limpieza express', 60, 400)) as t(n, name, dur, price) order by n
  loop
    insert into public.services (organization_id, name, duration_minutes, price, is_active) values (v_org, r.name, r.dur, r.price, true) returning id into v_id;
    v_svc := v_svc || v_id;
  end loop;

  -- 4 personas con horarios distintos (0 = domingo)
  for r in select * from (values
      (1, 'Lupita (ejemplo)',  array[1,2,3,4,5,6], time '08:00', time '16:00'),
      (2, 'Marisol (ejemplo)', array[2,3,4,5,6,0], time '09:00', time '17:00'),
      (3, 'Chayo (ejemplo)',   array[1,3,5,6],     time '10:00', time '18:00'),
      (4, 'Toño (ejemplo)',    array[4,5,6,0,1],   time '08:00', time '14:00')) as t(n, name, days, ini, fin) order by n
  loop
    insert into public.staff (organization_id, name, role, is_active) values (v_org, r.name, 'staff', true) returning id into v_id;
    v_staff := v_staff || v_id;
    insert into public.staff_schedules (staff_id, day_of_week, start_time, end_time, is_working)
    select v_id, x, r.ini, r.fin, true from unnest(r.days) x;
  end loop;

  -- Anfitriones y propiedades (teléfonos imposibles a propósito)
  for r in select * from (values
      ('Omar',                         '5210000000001', 'Depa Olas Altas',     'Zona Romántica'),
      ('Omar',                         '5210000000001', 'Loft Púlpito',        'Zona Romántica'),
      ('Bruno (anfitrión ejemplo)',   '5210000000002', 'Condo Marina 204',    'Marina Vallarta'),
      ('Bruno (anfitrión ejemplo)',   '5210000000002', 'Condo Marina 310',    'Marina Vallarta'),
      ('Carla (anfitriona ejemplo)',  '5210000000003', 'Casa Jacarandas',     'Versalles'),
      ('Diego (anfitrión ejemplo)',   '5210000000004', 'Estudio Francia',     'Versalles'),
      ('Diego (anfitrión ejemplo)',   '5210000000004', 'Penthouse Conchas',   'Conchas Chinas')) as t(host, phone, prop, zone)
  loop
    insert into public.customers (organization_id, name, phone, booking_token)
    values (v_org, r.host, r.phone, 'demo-' || substr(md5(v_org::text || r.phone), 1, 20))
    on conflict (organization_id, phone) do update set name = excluded.name
    returning id into v_id;
    insert into public.properties (organization_id, customer_id, name, zone) values (v_org, v_id, r.prop, r.zone) returning id into v_id;
    v_prop := v_prop || v_id;
  end loop;

  -- Reservas: 7 días atrás y 14 hacia adelante, una por persona en sus días de trabajo (con algunos huecos)
  v_today := (now() at time zone tz)::date;
  for d in -7..13 loop
    v_day := v_today + d;
    for s in 1..4 loop
      select start_time, end_time into v_start, v_end from public.staff_schedules
        where staff_id = v_staff[s] and day_of_week = extract(dow from v_day)::int limit 1;
      continue when not found;
      continue when d > 1 and (d + s) % 4 = 0;
      p := 1 + ((d + 7) * 3 + s) % array_length(v_prop, 1);
      k := 1 + ((d + 7) + s * 2) % 5;
      v_from := (v_day + v_start + interval '2 hours') at time zone tz;
      v_to := v_from + make_interval(mins => v_dur[k]);
      -- Hoy y mañana una entrega apretada, para que se vea la alerta
      v_deadline := v_to + case when d in (0, 1) and s in (1, 2) then interval '30 minutes' else interval '2 hours' end;
      v_past := v_to < now();
      insert into public.appointments (organization_id, customer_id, staff_id, service_id, property_id, starts_at, ends_at, deadline_at, status, confirmation_status, reminder_sent_at, notes)
      select v_org, pr.customer_id, v_staff[s], v_svc[k], pr.id, v_from, v_to, v_deadline,
        (case when v_past then 'completed' else 'confirmed' end)::appointment_status,
        case when v_past or (d + s) % 3 = 0 then 'confirmed' else null end,
        now(), -- ya "recordada": el cron no intenta avisar a nadie
        'Propiedad: ' || pr.name || ' · ' || pr.zone || ' · Entregar antes de las ' || to_char(v_deadline at time zone tz, 'HH24:MI')
      from public.properties pr where pr.id = v_prop[p];
    end loop;
  end loop;
end $$;

-- Links para la demo (el de cada anfitrión muestra sus propiedades)
select c.name, '/book/limpieza-vallarta-express?h=' || c.booking_token as link
from public.customers c join public.organizations o on o.id = c.organization_id
where o.slug = 'limpieza-vallarta-express' order by c.name;
