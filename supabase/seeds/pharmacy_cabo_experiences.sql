-- Carga en Servicios los servicios y experiencias de Cabo que se COTIZAN por chat (USD).
-- Entran INACTIVOS a propósito: así aparecen en el panel pero el bot no los agenda ni los cobra; el bot los
-- atiende consultando al responsable (motivo "cotización"). Precio 0 = se cotiza; los "desde" se dejan como referencia.
-- Se puede correr más de una vez: solo agrega los que no existan por nombre.
do $$
declare v_org uuid;
begin
  select id into v_org from organizations where slug = 'cabo-pharmacy' and business_type = 'pharmacy' limit 1;
  if v_org is null then raise exception 'No existe el negocio cabo-pharmacy'; end if;

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
