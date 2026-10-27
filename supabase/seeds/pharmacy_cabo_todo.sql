-- Servicios con precio fijo y agenda de Cabo Pharmacy (USD). Los demás servicios y experiencias se cotizan por chat.
-- Se puede correr más de una vez: solo agrega los que no existan por nombre.
do $$
declare v_org uuid;
begin
  -- Busca la farmacia por giro (el slug cambia si renombras el negocio); si hay varias, pon aquí el slug exacto
  select id into v_org from organizations where business_type = 'pharmacy' and (slug = 'cabo-pharmacy' or name ilike '%CMC%' or name ilike '%cabo%') order by created_at limit 1;
  if v_org is null then raise exception 'No encuentro el negocio de farmacia'; end if;

  insert into services (organization_id, name, description, duration_minutes, price, is_active)
  select v_org, s.name, s.descr, s.mins, s.price, true
  from (values
    ('Doctor at Your Villa',      'El médico evalúa, diagnostica y trata en tu ubicación (villa u hotel).', 60, 200),
    ('Labs & Rapid Testing',      'Toma de muestras y pruebas rápidas en tu villa u hotel.',                30,  59),
    ('Wound Care',                'Curaciones y cuidado post-operatorio en tu ubicación.',                  45, 149)
  ) as s(name, descr, mins, price)
  where not exists (select 1 from services x where x.organization_id = v_org and x.name = s.name);
end $$;
-- Carga en Servicios los servicios y experiencias de Cabo que se COTIZAN por chat (USD).
-- Entran INACTIVOS a propósito: así aparecen en el panel pero el bot no los agenda ni los cobra; el bot los
-- atiende consultando al responsable (motivo "cotización"). Precio 0 = se cotiza; los "desde" se dejan como referencia.
-- Se puede correr más de una vez: solo agrega los que no existan por nombre.
do $$
declare v_org uuid;
begin
  -- Busca la farmacia por giro (el slug cambia si renombras el negocio); si hay varias, pon aquí el slug exacto
  select id into v_org from organizations where business_type = 'pharmacy' and (slug = 'cabo-pharmacy' or name ilike '%CMC%' or name ilike '%cabo%') order by created_at limit 1;
  if v_org is null then raise exception 'No encuentro el negocio de farmacia'; end if;

  insert into services (organization_id, name, description, duration_minutes, price, is_active)
  select v_org, s.name, s.descr, s.mins, s.price, false
  from (values
    -- Salud
    ('Group IV (4+ personas)',            'Enfermera en la villa para 4 o más personas. Precio por persona: se cotiza.', 90, 0),
    ('Private Nursing',                   'Visitas o turnos de enfermería de 8, 12 o 24 horas. Se cotiza.', 480, 0),
    ('Nurse / Doctor on standby (eventos)','Enfermera o doctor de guardia para bodas, XV años y grupos. Se cotiza.', 240, 0),
    -- Celebraciones y sorpresas
    ('Flowers',                           'Ramos, arreglos, cajas florales y pétalos. Se cotiza.', 60, 0),
    ('Custom Cakes',                      'Pasteles personalizados, cheesecake y de pisos. Se cotiza.', 60, 0),
    ('Balloons & Room Decor',             'Decoración de cuarto o villa, letras y números gigantes, personalizados. Se cotiza.', 90, 0),
    ('Paquete Welcome to Cabo',           'Flores, pastel y globos. Se cotiza.', 90, 0),
    ('Paquete Birthday in Cabo',          'Room setup, globos personalizados y pastel. Se cotiza.', 90, 0),
    ('Paquete Girls Trip / Bachelorette', 'Decoración, bride-to-be setup e IV de recuperación opcional al día siguiente. Se cotiza.', 120, 0),
    ('Paquete Honeymoon Night',           'Pétalos, velas y champagne setup. Se cotiza.', 90, 0),
    ('Paquete Anniversary Dinner',        'Cena privada en terraza con chef. Se cotiza.', 180, 0),
    ('Mariachi Surprise',                 'Serenata en la villa. Se cotiza.', 60, 0),
    ('Villa Proposal',                    'Propuesta de matrimonio en la villa. Desde $1,190.', 180, 1190),
    ('Beach Proposal at Sunset',          'Propuesta de matrimonio en la playa al atardecer. Desde $1,650.', 180, 1650),
    ('Ranch Proposal',                    'Propuesta con caballos y mariachi. Desde $1,990.', 180, 1990),
    -- Experiencias en la villa
    ('Private Chef',                      'Cena preparada y servida en la villa. Se cotiza.', 180, 0),
    ('Private Bartender & Mixology',      'Barra y cócteles para el grupo. Se cotiza.', 240, 0),
    ('Mariachi / Trío / DJ / Saxofonista','Música en vivo para tu villa o evento. Se cotiza.', 120, 0),
    ('In-Villa Massage & Spa',            'Masaje y spa en la villa. Se cotiza.', 60, 0),
    ('Photographer',                      'Parejas, familia, vacaciones, maternidad y pre-boda. Se cotiza.', 90, 0),
    ('Magician / Kids Entertainer',       'Mago o animador infantil. Se cotiza.', 90, 0),
    ('Horseback Riding on the Beach',     'Paseo a caballo en la playa. Se cotiza.', 90, 0),
    ('Yacht / Boat',                      'Cena romántica o evento privado en yate (vía Papillon Yachts). Se cotiza.', 180, 0),
    -- Eventos y venue: Rancho McCoy
    ('Rancho McCoy - Boda íntima / Elopement',  'Venue rústico-elegante con show de caballos bailadores. Cotizar.', 240, 0),
    ('Rancho McCoy - Quinceañera',              'Con entrada a caballo. Cotizar.', 240, 0),
    ('Rancho McCoy - Birthday at the Ranch',    'Cotizar.', 240, 0),
    ('Rancho McCoy - Bautizo / Baby Shower / Evento familiar', 'Cotizar.', 240, 0),
    ('Rancho McCoy - Cena corporativa / Team building',        'Cotizar.', 240, 0),
    ('Rancho McCoy - Mexican Night',            'Cena, tequila, mariachi y caballos para grupos. Cotizar.', 240, 0),
    ('Rancho McCoy - Sesión de fotos / contenido','Cotizar.', 120, 0)
  ) as s(name, descr, mins, price)
  where not exists (select 1 from services x where x.organization_id = v_org and x.name = s.name);
end $$;
-- Tarifas de Rancho McCoy (octubre 2026, PESOS MXN) en la descripción de sus servicios.
-- No se usa la columna de precio: el negocio cobra en USD y estas tarifas son en MXN, y se cotizan por chat.
-- Correr DESPUÉS de pharmacy_cabo_experiences.sql. Se puede correr más de una vez.
do $$
declare v_org uuid;
begin
  -- Busca la farmacia por giro (el slug cambia si renombras el negocio); si hay varias, pon aquí el slug exacto
  select id into v_org from organizations where business_type = 'pharmacy' and (slug = 'cabo-pharmacy' or name ilike '%CMC%' or name ilike '%cabo%') order by created_at limit 1;
  if v_org is null then raise exception 'No encuentro el negocio de farmacia'; end if;

  update services set description = 'Renta del rancho + mobiliario + 6 horas, en MXN (tarifa general / Destination en inglés): 1-30 invitados $10,900 / $14,170; 31-60 $14,900 / $19,370; 61-90 $18,900 / $24,570; 91-120 $23,900 / $31,070; 121-150 $29,900 / $38,870; 151-199 $38,900 / $50,570.'
  where organization_id = v_org and name like 'Rancho McCoy - %' and name <> 'Rancho McCoy - Sesión de fotos / contenido';

  update services set description = 'Sesión de fotos en el rancho (1 h, dos caballos y camarógrafo): $9,500 MXN / $12,350 Destination. En la playa (1.5 h): $14,500 / $18,850. Sujeto a disponibilidad.'
  where organization_id = v_org and name = 'Rancho McCoy - Sesión de fotos / contenido';

  insert into services (organization_id, name, description, duration_minutes, price, is_active)
  select v_org, s.name, s.descr, s.mins, 0, false
  from (values
    ('Rancho McCoy - Extras (cabañas, horas, caballos)', 'MXN (general / Destination): una cabaña $3,500 / $4,550; dos cabañas $5,500 / $7,150; hora extra $3,200 / $4,160; dos horas extra $5,000 / $6,500; experiencia con dos caballos $5,000 / $6,500 (sin camarógrafo).', 60),
    ('Rancho McCoy - Servicios adicionales (comida, bebida, producción)', 'MXN (general / Destination): cena $389 / $505.70 por persona; barra libre $349 / $453.70 por persona; silla crossback $170 / $221 por persona; personal operativo $3,600 / $4,680 por 6 h; audio $13,500 / $17,550 por 6 h; decoración desde $17,900 / $23,270; iluminación por cotizar.', 60)
  ) as s(name, descr, mins)
  where not exists (select 1 from services x where x.organization_id = v_org and x.name = s.name);
end $$;
