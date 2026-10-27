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
