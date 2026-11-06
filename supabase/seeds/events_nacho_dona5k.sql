-- Usuario de Nacho Running + evento "Dona 5K" (16 nov 2026, Los Arcos, Miramar, Manzanillo).
-- 1) Nacho se registra en /register (cualquier giro). 2) Cambia v_email por el correo con el que se registró. 3) Corre este script.
-- Cambia su giro a 'events', activa la cuenta sin cobro y crea el evento. Se puede correr más de una vez.
do $$
declare
  v_email text := 'CAMBIA_POR_EL_CORREO_DE_NACHO@correo.com';
  v_org uuid;
  v_user uuid;
begin
  select (u.raw_user_meta_data->>'organization_id')::uuid, u.id into v_org, v_user from auth.users u where lower(u.email) = lower(v_email);
  if v_org is null then raise exception 'Nacho aún no se registra con ese correo (%)', v_email; end if;

  update public.organizations set business_type = 'events', subscription_status = 'active', whatsapp_bot_enabled = false where id = v_org;
  if not exists (select 1 from public.staff where organization_id = v_org and is_owner) then
    insert into public.staff (organization_id, user_id, name, role, is_owner, is_active)
    select v_org, v_user, o.name, 'Organizador', true, true from public.organizations o where o.id = v_org;
  end if;

  insert into public.events (organization_id, slug, title, subtitle, description, event_date, location, price, currency, image_url)
  values (v_org, 'dona5k', 'Dona 5K', 'Un Día Para Donar · UDEC',
    E'Vive una mañana llena de energía y diversión, con ambientación musical, puntos de hidratación y medalla para los corredores.\n¡Corre, disfruta y haz que cada paso cuente!',
    '2026-11-16 07:00:00-06', 'Los Arcos, Miramar, Manzanillo', 150, 'mxn', '/events/dona5k.jpg')
  on conflict (slug) do nothing;
end $$;
