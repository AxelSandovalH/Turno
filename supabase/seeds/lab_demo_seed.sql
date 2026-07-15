-- ============================================================================
-- SEED: catálogo de laboratorio para la org demo (slug 'lab-demo')
-- 4 estudios reales con sus analitos asociados. Idempotente: limpia el
-- catálogo de la org antes de reinsertar.
-- ============================================================================

do $$
declare
  v_org uuid;
  v_test uuid;
  v_analyte uuid;
  i int;
  -- [estudio, descripción, precio]
  tests text[][] := array[
    ['Biometría Hemática', 'Conteo completo de células sanguíneas', '250'],
    ['Química Sanguínea (6 elementos)', 'Metabolitos básicos en sangre', '320'],
    ['Perfil Lipídico', 'Colesterol y triglicéridos', '380'],
    ['Examen General de Orina', 'Análisis físico, químico y microscópico', '180']
  ];
  -- [estudio, analito, unidad, rango]
  links text[][] := array[
    ['Biometría Hemática', 'Hemoglobina',       'g/dL',    '13.5 - 17.5'],
    ['Biometría Hemática', 'Hematocrito',       '%',       '41 - 53'],
    ['Biometría Hemática', 'Leucocitos',        'x10³/µL', '4.5 - 11.0'],
    ['Biometría Hemática', 'Plaquetas',         'x10³/µL', '150 - 450'],
    ['Biometría Hemática', 'Eritrocitos',       'x10⁶/µL', '4.5 - 5.9'],
    ['Química Sanguínea (6 elementos)', 'Glucosa',      'mg/dL', '70 - 100'],
    ['Química Sanguínea (6 elementos)', 'Urea',         'mg/dL', '15 - 45'],
    ['Química Sanguínea (6 elementos)', 'Creatinina',   'mg/dL', '0.7 - 1.3'],
    ['Química Sanguínea (6 elementos)', 'Ácido úrico',  'mg/dL', '3.5 - 7.2'],
    ['Perfil Lipídico', 'Colesterol total', 'mg/dL', '< 200'],
    ['Perfil Lipídico', 'Colesterol HDL',   'mg/dL', '> 40'],
    ['Perfil Lipídico', 'Colesterol LDL',   'mg/dL', '< 130'],
    ['Perfil Lipídico', 'Triglicéridos',    'mg/dL', '< 150'],
    ['Examen General de Orina', 'Densidad',   '',      '1.005 - 1.030'],
    ['Examen General de Orina', 'pH',         '',      '4.5 - 8.0'],
    ['Examen General de Orina', 'Proteínas',  'mg/dL', 'Negativo'],
    ['Examen General de Orina', 'Glucosa en orina', 'mg/dL', 'Negativo']
  ];
begin
  select id into v_org from public.organizations where slug = 'lab-demo';
  if v_org is null then
    raise exception 'No existe la org lab-demo';
  end if;

  -- Limpieza previa del catálogo (cascada borra lab_test_analytes)
  delete from public.lab_tests where organization_id = v_org;
  delete from public.lab_analytes where organization_id = v_org;

  -- Estudios
  for i in 1..array_length(tests, 1) loop
    insert into public.lab_tests (organization_id, name, description, price, is_active)
    values (v_org, tests[i][1], tests[i][2], tests[i][3]::numeric, true);
  end loop;

  -- Analitos (únicos) + asociaciones con orden
  for i in 1..array_length(links, 1) loop
    -- crea el analito si no existe aún
    select id into v_analyte from public.lab_analytes
      where organization_id = v_org and name = links[i][2];
    if v_analyte is null then
      insert into public.lab_analytes (organization_id, name, default_unit, ref_range, is_active)
      values (v_org, links[i][2], nullif(links[i][3], ''), links[i][4], true)
      returning id into v_analyte;
    end if;

    select id into v_test from public.lab_tests
      where organization_id = v_org and name = links[i][1];

    insert into public.lab_test_analytes (test_id, analyte_id, sort_order)
    values (v_test, v_analyte, i);
  end loop;

  raise notice 'Catálogo demo creado para org %', v_org;
end $$;
