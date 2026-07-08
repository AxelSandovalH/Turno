-- ============================================================================
-- DEMO: Piedi Carino Beauty & Spa (Cabo San Lucas)
-- Córrelo en el SQL Editor de Supabase. Idempotente: borra la org antes de
-- reinsertar, así que puedes correrlo varias veces sin duplicar.
-- ============================================================================

-- Limpieza previa (por si ya existe)
delete from organizations where slug = 'piedi-carino';

do $$
declare
  v_org   uuid;
  v_staff uuid[];
  v_svc   uuid[];
  v_dur   int[];
  v_cust  uuid[];
  d int; k int; per_day int;
  v_start timestamptz; v_end timestamptz;
  idx int; v_service_idx int;
  v_status text; v_conf text;
  names text[] := array[
    'María Fernanda López','Regina Castro','Ana Sofía Morales','Paulina Vega',
    'Gabriela Ríos','Andrea Salinas','Ximena Ortega','Carmen Delgado',
    'Fernanda Guzmán','Lucía Mendoza','Renata Flores','Isabela Cruz'];
  nm text;
begin
  -- 1) Organización
  insert into organizations (name, slug, business_type, whatsapp_number, phone, email, address, timezone, subscription_status, welcome_message)
  values (
    'Piedi Carino Beauty & Spa', 'piedi-carino', 'barbershop', '526241050423', '6241050423',
    'demo@quickturno.app',
    'Blvd. Lázaro Cárdenas S/N, Puerto Paraíso Local 37, Centro, Cabo San Lucas, B.C.S.',
    'America/Mazatlan', 'active',
    '¡Hola! 💅 Bienvenido a Piedi Carino Beauty & Spa. ¿En qué servicio te puedo ayudar hoy?'
  )
  returning id into v_org;

  -- 2) Sucursal
  insert into branches (organization_id, name) values (v_org, 'Puerto Paraíso');

  -- 3) Servicios
  insert into services (organization_id, name, duration_minutes, price, is_active) values
    (v_org, 'Manicure',          45, 350, true),
    (v_org, 'Pedicure spa',      60, 450, true),
    (v_org, 'Uñas acrílicas',    90, 650, true),
    (v_org, 'Facial hidratante', 60, 700, true),
    (v_org, 'Masaje relajante',  60, 850, true),
    (v_org, 'Corte y peinado',   50, 400, true);

  select array_agg(id order by name), array_agg(duration_minutes order by name)
    into v_svc, v_dur from services where organization_id = v_org;

  -- 4) Estilistas
  insert into staff (organization_id, name, role, is_active, specialty) values
    (v_org, 'Valeria Núñez', 'owner', true, 'Uñas y manicure'),
    (v_org, 'Daniela Ruiz',  'staff', true, 'Faciales y masaje'),
    (v_org, 'Sofía Herrera', 'staff', true, 'Cabello');

  select array_agg(id order by name) into v_staff from staff where organization_id = v_org;

  -- 5) Horarios: lunes(1) a sábado(6), 10:00–20:00
  insert into staff_schedules (staff_id, day_of_week, start_time, end_time, is_working)
  select s, dow, '10:00', '20:00', true
  from unnest(v_staff) s, generate_series(1, 6) dow;

  -- 6) Clientes
  foreach nm in array names loop
    insert into customers (organization_id, name, phone, is_active)
    values (v_org, nm, '52624' || lpad((1000000 + floor(random()*8999999))::text, 7, '0'), true);
  end loop;

  select array_agg(id) into v_cust from customers where organization_id = v_org;

  -- 7) Citas repartidas de -14 a +10 días
  for d in -14..10 loop
    per_day := 2 + floor(random() * 3)::int;  -- 2–4 por día
    for k in 1..per_day loop
      v_service_idx := 1 + floor(random() * array_length(v_svc, 1))::int;
      v_start := date_trunc('day', now() + (d || ' days')::interval)
                 + ((10 + floor(random()*8)) || ' hours')::interval
                 + (case when random() < 0.5 then '0 min' else '30 min' end)::interval;
      v_end := v_start + (v_dur[v_service_idx] || ' min')::interval;

      if d < 0 then
        v_status := case when random() < 0.85 then 'completed' else 'no_show' end;
        v_conf := 'confirmed';
      elsif d = 0 then
        v_status := 'confirmed'; v_conf := 'confirmed';
      else
        v_status := 'confirmed';
        v_conf := case when random() < 0.5 then 'confirmed' else 'pending' end;
      end if;

      insert into appointments (organization_id, customer_id, staff_id, service_id, starts_at, ends_at, status, confirmation_status)
      values (
        v_org,
        v_cust[1 + floor(random() * array_length(v_cust, 1))::int],
        v_staff[1 + floor(random() * array_length(v_staff, 1))::int],
        v_svc[v_service_idx],
        v_start, v_end, v_status::appointment_status, v_conf
      );
    end loop;
  end loop;

  raise notice 'Org demo creada: %', v_org;
end $$;
