-- DEMO para presentarle QuickTurno a Ultra Costa Trail: página /carrera/camino-al-mictlan-demo
-- (Camino al Mictlán, 27 feb 2027, Playa Las Palmitas, Manzanillo). Datos tomados de su página pública y su Instagram.
-- 1) Regístrate en /register con el correo ultracostatrail@quickturno.app, y como nombre del negocio "Ultra Costa Trail" (cualquier giro).
--    Si ese correo no recibe mensajes y la cuenta pide confirmarlo, usa un alias tuyo de Gmail (tucorreo+ultracostatrail@gmail.com) y cámbialo en v_email.
-- 2) Corre este script. Se puede correr más de una vez.
-- OJO: sin Clip conectado, los pagos de la demo van al Stripe de la plataforma. Muéstrala tú y no la compartas abierta.
-- Para cerrarla: desactiva las inscripciones en el panel de Evento o pon is_open = false.
do $$
declare
  v_email text := 'ultracostatrail@quickturno.app';
  v_org uuid;
  v_user uuid;
begin
  select (u.raw_user_meta_data->>'organization_id')::uuid, u.id into v_org, v_user from auth.users u where lower(u.email) = lower(v_email);
  if v_org is null then raise exception 'Ese correo aún no se registra (%)', v_email; end if;

  update public.organizations set name = 'Ultra Costa Trail', business_type = 'events', subscription_status = 'active', whatsapp_bot_enabled = false where id = v_org;
  if not exists (select 1 from public.staff where organization_id = v_org and is_owner) then
    insert into public.staff (organization_id, user_id, name, role, is_owner, is_active)
    select v_org, v_user, o.name, 'Organizador', true, true from public.organizations o where o.id = v_org;
  end if;

  insert into public.events (organization_id, slug, title, subtitle, description, event_date, location, price, currency, image_url, capacity)
  values (v_org, 'camino-al-mictlan-demo', 'Camino al Mictlán', 'Resiste. Avanza. Conquista.',
    E'Una carrera de trail a campo traviesa que combina reto físico y conexión con la naturaleza en Manzanillo.\nDos distancias, 13 km y 23 km, con salida y meta en Playa Las Palmitas.\nCupo limitado a 300 competidores. Entrega de paquetes el viernes 26 de febrero, de 2:00 a 7:00 pm, en el Restaurante Isla Cagua (Salagua).',
    '2027-02-27 07:00:00-06', 'Playa Las Palmitas, Manzanillo, Colima', 620, 'mxn', '/events/mictlan.jpg', 300)
  on conflict (slug) do nothing;

  update public.events set
    organizer = 'Ultra Costa Trail',
    packages = '[
      {"name": "13 km", "price": 620, "includes": ["Desnivel positivo de 398 m", "Playera conmemorativa", "Número con chip de cronometraje", "Medalla de finalista", "Hidratación en ruta y meta", "Servicio médico"]},
      {"name": "23 km", "price": 720, "includes": ["Desnivel positivo de 980 m", "Playera conmemorativa", "Número con chip de cronometraje", "Medalla de finalista", "Hidratación en ruta y meta", "Servicio médico"]}
    ]'::jsonb,
    gallery = '[
      {"src": "/events/mictlan/corredores-playa.jpg", "alt": "Corredores de trail en la playa", "pos": "center 80%"}
    ]'::jsonb
  where slug = 'camino-al-mictlan-demo';
end $$;
