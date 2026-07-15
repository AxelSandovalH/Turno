-- ============================================================================
-- SEED: pacientes y órdenes para la org demo de laboratorio (slug 'lab-demo')
-- Requiere haber corrido antes lab_demo_seed.sql (catálogo de estudios).
-- Idempotente: borra órdenes/pacientes/folios de la org antes de reinsertar.
-- 12 pacientes + ~16 órdenes de los últimos 20 días en todos los estados;
-- las órdenes con resultados llevan valores capturados por analito.
-- ============================================================================

do $$
declare
  v_org uuid;
  v_staff uuid;
  v_cust uuid[];
  v_tests uuid[];
  v_order uuid;
  v_order_test uuid;
  v_folio int;
  v_status text;
  v_created timestamptz;
  v_subtotal numeric;
  v_n_tests int;
  v_test uuid;
  v_price numeric;
  r record;
  i int; k int;
  patients text[][] := array[
    ['María Fernanda López',   '5215511110001', '1988-03-14', 'female'],
    ['José Antonio Ramírez',   '5215511110002', '1975-11-02', 'male'],
    ['Regina Castro Méndez',   '5215511110003', '1992-07-21', 'female'],
    ['Carlos Eduardo Núñez',   '5215511110004', '1969-01-30', 'male'],
    ['Ana Sofía Morales',      '5215511110005', '2001-05-09', 'female'],
    ['Luis Fernando Vega',     '5215511110006', '1983-09-17', 'male'],
    ['Gabriela Ríos Ortega',   '5215511110007', '1996-12-04', 'female'],
    ['Roberto Salinas Cruz',   '5215511110008', '1958-06-25', 'male'],
    ['Ximena Delgado Flores',  '5215511110009', '1990-02-11', 'female'],
    ['Fernando Guzmán Peña',   '5215511110010', '1979-08-08', 'male'],
    ['Lucía Mendoza Aguilar',  '5215511110011', '1965-04-19', 'female'],
    ['Renata Torres Ibarra',   '5215511110012', '1999-10-27', 'female']
  ];
begin
  select id into v_org from public.organizations where slug = 'lab-demo';
  if v_org is null then raise exception 'No existe la org lab-demo'; end if;

  select id into v_staff from public.staff
    where organization_id = v_org and role = 'owner' limit 1;

  -- Limpieza previa (orden importa por FKs)
  delete from public.lab_orders where organization_id = v_org;
  delete from public.lab_folio_counters where organization_id = v_org;
  delete from public.customers where organization_id = v_org;

  -- Pacientes
  for i in 1..array_length(patients, 1) loop
    insert into public.customers (organization_id, name, phone, date_of_birth, gender, is_active)
    values (v_org, patients[i][1], patients[i][2], patients[i][3]::date, patients[i][4]::patient_gender, true);
  end loop;
  select array_agg(id) into v_cust from public.customers where organization_id = v_org;

  select array_agg(id) into v_tests from public.lab_tests where organization_id = v_org and is_active;
  if v_tests is null then raise exception 'Corre primero lab_demo_seed.sql (no hay estudios)'; end if;

  -- Órdenes: 16 repartidas en los últimos 20 días
  for i in 1..16 loop
    v_created := now() - ((20 - i + random())::text || ' days')::interval;

    -- estado según antigüedad: viejas entregadas, medias en captura, recientes nuevas
    if i <= 6 then
      v_status := 'delivered';
    elsif i <= 9 then
      v_status := 'results_ready';
    elsif i <= 12 then
      v_status := 'in_process';
    elsif i <= 15 then
      v_status := 'registered';
    else
      v_status := 'cancelled';
    end if;

    select public.next_lab_folio(v_org) into v_folio;

    insert into public.lab_orders (organization_id, customer_id, created_by, folio, status, subtotal, discount, total, created_at,
                                   delivered_at, cancelled_at)
    values (
      v_org,
      v_cust[1 + floor(random() * array_length(v_cust, 1))::int],
      v_staff,
      'LD-' || extract(year from now())::int || '-' || lpad(v_folio::text, 5, '0'),
      v_status::lab_order_status,
      0, 0, 0,
      v_created,
      case when v_status = 'delivered' then v_created + interval '1 day' end,
      case when v_status = 'cancelled' then v_created + interval '2 hours' end
    )
    returning id into v_order;

    -- 1 a 3 estudios distintos por orden, con snapshot de precio
    v_subtotal := 0;
    v_n_tests := 1 + floor(random() * 3)::int;
    for k in 1..v_n_tests loop
      v_test := v_tests[1 + ((i + k) % array_length(v_tests, 1))];  -- rota sin repetir dentro de la orden
      select price into v_price from public.lab_tests where id = v_test;

      insert into public.lab_order_tests (order_id, test_id, price_at_order)
      values (v_order, v_test, v_price)
      on conflict (order_id, test_id) do nothing;

      if found then v_subtotal := v_subtotal + v_price; end if;
    end loop;

    update public.lab_orders set subtotal = v_subtotal, total = v_subtotal where id = v_order;

    -- Resultados capturados para órdenes en results_ready / delivered
    if v_status in ('results_ready', 'delivered') then
      for r in
        select ot.id as order_test_id, ta.analyte_id, a.default_unit, a.ref_range
        from public.lab_order_tests ot
        join public.lab_test_analytes ta on ta.test_id = ot.test_id
        join public.lab_analytes a on a.id = ta.analyte_id
        where ot.order_id = v_order
      loop
        insert into public.lab_order_results (order_test_id, analyte_id, value, unit, ref_range, captured_by, captured_at)
        values (
          r.order_test_id,
          r.analyte_id,
          round((50 + random() * 100)::numeric, 1)::text,
          r.default_unit,
          r.ref_range,
          v_staff,
          v_created + interval '6 hours'
        );
      end loop;
    end if;
  end loop;

  raise notice 'Seed de órdenes listo para org %', v_org;
end $$;
