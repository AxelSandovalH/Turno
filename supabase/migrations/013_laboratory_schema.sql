-- =============================================================================
-- TURNO — Perfil Laboratorio Clínico (Fase 1)
-- Catálogo de estudios/analitos, órdenes con folio por organización,
-- captura de resultados y cotizaciones. Multi-tenant con RLS idéntica al resto.
-- =============================================================================

-- Estados de una orden de laboratorio
create type lab_order_status as enum (
  'registered',       -- Registrada
  'in_process',       -- En proceso
  'results_ready',    -- Resultados capturados
  'delivered',        -- Entregada
  'cancelled'         -- Cancelada
);

-- =============================================================================
-- CATÁLOGO
-- =============================================================================

-- Estudios (ej. Biometría Hemática, Química Sanguínea)
create table lab_tests (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name            text not null,
  description     text,
  price           numeric not null default 0 check (price >= 0),
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index on lab_tests (organization_id);

-- Analitos (ej. Hemoglobina, Glucosa). Catálogo por organización; la unidad y
-- el rango de referencia aquí son los valores por defecto que se precargan al
-- capturar (editables por resultado).
create table lab_analytes (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name            text not null,
  default_unit    text,
  ref_range       text,   -- texto libre: "13.5 - 17.5", "Negativo", "< 200"
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index on lab_analytes (organization_id);

-- Relacional Estudio ↔ Analitos. Un analito solo puede capturarse dentro de
-- una orden si pertenece al estudio vía esta tabla (ver trigger más abajo).
create table lab_test_analytes (
  id          uuid primary key default gen_random_uuid(),
  test_id     uuid not null references lab_tests(id) on delete cascade,
  analyte_id  uuid not null references lab_analytes(id) on delete cascade,
  sort_order  integer not null default 0,
  unique (test_id, analyte_id)
);
create index on lab_test_analytes (test_id);

-- =============================================================================
-- ÓRDENES
-- =============================================================================

-- Folio consecutivo por organización (PC-2026-00042). El prefijo se deriva del
-- nombre de la org en la capa de aplicación; aquí solo el consecutivo por año.
create table lab_folio_counters (
  organization_id uuid not null references organizations(id) on delete cascade,
  year            integer not null,
  counter         integer not null default 0,
  primary key (organization_id, year)
);

create or replace function next_lab_folio(p_org uuid)
returns integer
language plpgsql
as $$
declare
  v_year int := extract(year from now())::int;
  v_next int;
begin
  insert into lab_folio_counters (organization_id, year, counter)
  values (p_org, v_year, 1)
  on conflict (organization_id, year)
  do update set counter = lab_folio_counters.counter + 1
  returning counter into v_next;
  return v_next;
end;
$$;

create table lab_orders (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  customer_id     uuid not null references customers(id) on delete restrict,
  created_by      uuid references staff(id) on delete set null,
  folio           text not null,
  status          lab_order_status not null default 'registered',
  subtotal        numeric not null default 0 check (subtotal >= 0),
  discount        numeric not null default 0 check (discount >= 0),
  total           numeric not null default 0 check (total >= 0),
  notes           text,
  delivered_at    timestamptz,
  cancelled_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (organization_id, folio)
);
create index on lab_orders (organization_id, status);
create index on lab_orders (customer_id);

-- Estudios incluidos en una orden. price_at_order es snapshot: el precio del
-- catálogo puede cambiar después sin afectar órdenes/recibos ya emitidos.
create table lab_order_tests (
  id              uuid primary key default gen_random_uuid(),
  order_id        uuid not null references lab_orders(id) on delete cascade,
  test_id         uuid not null references lab_tests(id) on delete restrict,
  price_at_order  numeric not null default 0 check (price_at_order >= 0),
  unique (order_id, test_id)
);
create index on lab_order_tests (order_id);

-- Resultados por analito. unit y ref_range se precargan del catálogo al
-- momento de capturar (snapshot editable): un reporte emitido no cambia si
-- el catálogo se edita después.
create table lab_order_results (
  id             uuid primary key default gen_random_uuid(),
  order_test_id  uuid not null references lab_order_tests(id) on delete cascade,
  analyte_id     uuid not null references lab_analytes(id) on delete restrict,
  value          text,
  unit           text,
  ref_range      text,
  captured_by    uuid references staff(id) on delete set null,
  captured_at    timestamptz,
  validated_by   uuid references staff(id) on delete set null,  -- responsable sanitario (NOM-007)
  validated_at   timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (order_test_id, analyte_id)
);

-- Integridad dura: el analito de un resultado DEBE pertenecer al estudio de esa
-- fila de la orden (tercera línea de defensa además de la UI y la relacional).
create or replace function check_result_analyte_belongs_to_test()
returns trigger
language plpgsql
as $$
declare
  v_test uuid;
begin
  select test_id into v_test from lab_order_tests where id = new.order_test_id;
  if not exists (
    select 1 from lab_test_analytes
    where test_id = v_test and analyte_id = new.analyte_id
  ) then
    raise exception 'El analito % no pertenece al estudio de esta orden', new.analyte_id;
  end if;
  return new;
end;
$$;

create trigger lab_order_results_analyte_check
  before insert or update on lab_order_results
  for each row execute function check_result_analyte_belongs_to_test();

-- =============================================================================
-- COTIZACIONES (sin venta)
-- =============================================================================

create table lab_quotes (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  customer_id     uuid references customers(id) on delete set null,
  customer_name   text,           -- para cotizar sin registrar paciente
  created_by      uuid references staff(id) on delete set null,
  folio           text not null,
  subtotal        numeric not null default 0,
  discount        numeric not null default 0,
  total           numeric not null default 0,
  valid_until     date,
  created_at      timestamptz not null default now(),
  unique (organization_id, folio)
);
create index on lab_quotes (organization_id);

create table lab_quote_tests (
  id              uuid primary key default gen_random_uuid(),
  quote_id        uuid not null references lab_quotes(id) on delete cascade,
  test_id         uuid not null references lab_tests(id) on delete restrict,
  price_at_quote  numeric not null default 0,
  unique (quote_id, test_id)
);

-- =============================================================================
-- FACTURACIÓN OPCIONAL DEL PACIENTE (compartido — útil en todos los perfiles)
-- =============================================================================

alter table customers
  add column if not exists rfc text,
  add column if not exists billing_name text,
  add column if not exists billing_email text;

-- =============================================================================
-- RLS — mismo patrón que el resto del schema
-- =============================================================================

alter table lab_tests          enable row level security;
alter table lab_analytes       enable row level security;
alter table lab_test_analytes  enable row level security;
alter table lab_folio_counters enable row level security;
alter table lab_orders         enable row level security;
alter table lab_order_tests    enable row level security;
alter table lab_order_results  enable row level security;
alter table lab_quotes         enable row level security;
alter table lab_quote_tests    enable row level security;

create policy "lab_tests_all" on lab_tests
  for all using (organization_id = public.current_organization_id());

create policy "lab_analytes_all" on lab_analytes
  for all using (organization_id = public.current_organization_id());

create policy "lab_test_analytes_all" on lab_test_analytes
  for all using (
    test_id in (select id from lab_tests where organization_id = public.current_organization_id())
  );

create policy "lab_folio_counters_all" on lab_folio_counters
  for all using (organization_id = public.current_organization_id());

create policy "lab_orders_all" on lab_orders
  for all using (organization_id = public.current_organization_id());

create policy "lab_order_tests_all" on lab_order_tests
  for all using (
    order_id in (select id from lab_orders where organization_id = public.current_organization_id())
  );

create policy "lab_order_results_all" on lab_order_results
  for all using (
    order_test_id in (
      select ot.id from lab_order_tests ot
      join lab_orders o on o.id = ot.order_id
      where o.organization_id = public.current_organization_id()
    )
  );

create policy "lab_quotes_all" on lab_quotes
  for all using (organization_id = public.current_organization_id());

create policy "lab_quote_tests_all" on lab_quote_tests
  for all using (
    quote_id in (select id from lab_quotes where organization_id = public.current_organization_id())
  );
