-- Cabo Surprise 2026 (USD): paquetes con precio fijo para el panel de Servicios de Cabo Pharmacy.
-- Entran INACTIVOS: el bot los cotiza y cobra con sus herramientas (surprise_quote / surprise_request_deposit), no con la agenda.
-- Reemplaza los paquetes viejos "Paquete Anniversary Dinner" y "Paquete Girls Trip / Bachelorette" (se desactivan si existen).
-- Se puede correr más de una vez.
do $$
declare v_org uuid;
begin
  select id into v_org from organizations where business_type = 'pharmacy' and (slug = 'cabo-pharmacy' or name ilike '%CMC%' or name ilike '%cabo%') order by created_at limit 1;
  if v_org is null then raise exception 'No encuentro el negocio de farmacia'; end if;

  update services set is_active = false where organization_id = v_org and name in ('Paquete Anniversary Dinner', 'Paquete Girls Trip / Bachelorette');

  insert into services (organization_id, name, description, duration_minutes, price, is_active)
  select v_org, s.name, s.descr, s.mins, s.price, false
  from (values
    ('Anniversary - Romantic Dinner (2)',        'Cena de tres tiempos, área privada, mobiliario, servicio y coordinación. Anticipo 50%.', 180, 790),
    ('Anniversary - Intimate (3-5)',             'Cena privada para 3 a 5 personas. Anticipo 50%.', 180, 1790),
    ('Anniversary - Luxury (6-8)',               'Cena privada para 6 a 8 personas. Anticipo 50%.', 180, 2790),
    ('Anniversary - Luxury Group (9-12)',        'Cena privada para 9 a 12 personas. Anticipo 50%.', 180, 3790),
    ('Anniversary - Grand Dinner (13-15)',       'Cena privada para 13 a 15 personas. Anticipo 50%.', 180, 4490),
    ('Ranch Wedding Reception (10-30)',          '6 horas, uso exclusivo, cena, DJ/audio, iluminación y decoración básica. Saldo 30 días antes.', 360, 6500),
    ('Ranch Wedding Reception (31-50)',          '6 horas, uso exclusivo, cena, DJ/audio, iluminación y decoración básica. Saldo 30 días antes.', 360, 9500),
    ('Ranch Wedding Reception (51-80)',          '6 horas, uso exclusivo, cena, DJ/audio, iluminación y decoración básica. Saldo 30 días antes.', 360, 13500),
    ('Ranch Wedding Reception (81-120)',         '6 horas, uso exclusivo, cena, DJ/audio, iluminación y decoración básica. Saldo 30 días antes.', 360, 18500),
    ('Ranch Wedding Reception (121-150)',        '6 horas, uso exclusivo, cena, DJ/audio, iluminación y decoración básica. Saldo 30 días antes.', 360, 23500),
    ('Ranch Wedding Reception (151-180)',        '6 horas, uso exclusivo, cena, DJ/audio, iluminación y decoración básica. Saldo 30 días antes.', 360, 27500),
    ('Private Beach Horse Photoshoot',           '90 min, 2 personas, 2 caballos, fotógrafo y 25 imágenes editadas en 7 días. Saldo 7 días antes.', 90, 1250),
    ('Private Ranch Cabin Stay (por noche)',     'Dos cabañas, 2 personas por cabaña (máx. 4). Anticipo 50% de toda la estancia.', 1440, 425),
    ('Private Beach Horse Experience (hasta 4)', '4 caballos y guía; permisos sujetos a validación. Saldo 7 días antes.', 90, 1600),
    ('Bachelorette Ranch Party (hasta 5)',       'Espacio privado, DJ, bartender, personal y montaje. Bebidas y alimentos no incluidos.', 240, 1490),
    ('Bachelorette Ranch Party (6-10)',          'Espacio privado, DJ, bartender, personal y montaje. Bebidas y alimentos no incluidos.', 240, 1990),
    ('Bachelorette Ranch Party (11-20)',         'Espacio privado, DJ, bartender, personal y montaje. Bebidas y alimentos no incluidos.', 240, 2790),
    ('Bachelorette Ranch Party (21-30)',         'Espacio privado, DJ, bartender, personal y montaje. Bebidas y alimentos no incluidos.', 240, 3800)
  ) as s(name, descr, mins, price)
  where not exists (select 1 from services x where x.organization_id = v_org and x.name = s.name);
end $$;
