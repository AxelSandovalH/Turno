-- =============================================================================
-- TURNO — Fase 1: Expediente Clínico
-- Attachments, Payments, ROM fields, Referring doctor
-- =============================================================================


-- =============================================================================
-- NEW ENUMS
-- =============================================================================

create type payment_method as enum (
  'cash',
  'card',
  'transfer',
  'insurance',
  'other'
);

create type payment_status as enum (
  'paid',
  'pending',
  'refunded'
);

create type attachment_category as enum (
  'xray',
  'mri',
  'lab',
  'prescription',
  'referral',
  'other'
);


-- =============================================================================
-- EXTEND CUSTOMERS — referring doctor + NOM-004 fields
-- =============================================================================

alter table customers
  add column if not exists referring_doctor           text,
  add column if not exists referring_doctor_specialty text,
  add column if not exists referring_doctor_phone     text,
  add column if not exists civil_status               text,
  add column if not exists insurance_provider         text,
  add column if not exists insurance_policy           text;

comment on column customers.referring_doctor is 'Médico que refirió al paciente (ortopeda, traumatólogo, neurólogo, etc.)';
comment on column customers.insurance_provider is 'Aseguradora o seguro médico del paciente.';


-- =============================================================================
-- EXTEND APPOINTMENT_NOTES — range of motion + NOM-004
-- =============================================================================

alter table appointment_notes
  add column if not exists rom_cervical     text,   -- rango de movimiento cervical
  add column if not exists rom_shoulder_l   text,
  add column if not exists rom_shoulder_r   text,
  add column if not exists rom_lumbar       text,
  add column if not exists rom_hip_l        text,
  add column if not exists rom_hip_r        text,
  add column if not exists rom_knee_l       text,
  add column if not exists rom_knee_r       text,
  add column if not exists rom_ankle_l      text,
  add column if not exists rom_ankle_r      text,
  add column if not exists rom_custom       text,   -- otras articulaciones, texto libre
  add column if not exists functional_goals text,   -- metas funcionales de la sesión
  add column if not exists next_session_plan text;  -- indicaciones para la próxima sesión

comment on column appointment_notes.rom_cervical is 'Rango de movimiento en grados. Ej: "Flexión 40°, Extensión 35°"';


-- =============================================================================
-- ATTACHMENTS — files linked to patient or appointment
-- =============================================================================

create table attachments (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  customer_id     uuid not null references customers(id) on delete cascade,
  appointment_id  uuid references appointments(id) on delete set null,
  treatment_plan_id uuid references treatment_plans(id) on delete set null,

  name            text not null,
  storage_path    text not null,    -- Supabase Storage path: org_id/patient_id/filename
  file_url        text not null,    -- public or signed URL
  mime_type       text,
  file_size_bytes int,
  category        attachment_category not null default 'other',
  notes           text,
  uploaded_by     uuid references auth.users(id) on delete set null,

  created_at      timestamptz not null default now()
);

comment on table attachments is 'Archivos clínicos del paciente: radiografías, resonancias, estudios de lab, recetas. Almacenados en Supabase Storage.';


-- =============================================================================
-- PAYMENTS — session payment tracking per patient
-- =============================================================================

create table payments (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations(id) on delete cascade,
  customer_id      uuid not null references customers(id) on delete cascade,
  appointment_id   uuid references appointments(id) on delete set null,
  treatment_plan_id uuid references treatment_plans(id) on delete set null,
  staff_id         uuid references staff(id) on delete set null,  -- terapeuta que generó el ingreso

  amount           numeric(10, 2) not null check (amount >= 0),
  currency         text not null default 'MXN',
  method           payment_method not null default 'cash',
  status           payment_status not null default 'paid',
  concept          text,           -- descripción libre: "Sesión 3 - Plan 10 sesiones"
  notes            text,
  paid_at          timestamptz default now(),

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

comment on table payments is 'Registro de pagos por sesión. Independiente del método (efectivo, transferencia, tarjeta). Base para dashboard financiero y comisiones.';


-- =============================================================================
-- INDEXES
-- =============================================================================

create index on attachments (organization_id, customer_id);
create index on attachments (appointment_id);

create index on payments (organization_id, paid_at);
create index on payments (customer_id);
create index on payments (staff_id, paid_at);
create index on payments (treatment_plan_id);
create index on payments (status);


-- =============================================================================
-- UPDATED_AT TRIGGER
-- =============================================================================

create trigger set_updated_at before update on payments
  for each row execute function set_updated_at();


-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

alter table attachments enable row level security;
alter table payments     enable row level security;

create policy "attachments_all" on attachments
  for all using (organization_id = public.current_organization_id());

create policy "payments_all" on payments
  for all using (organization_id = public.current_organization_id());


-- =============================================================================
-- CONVENIENCE VIEW — patient financial summary
-- =============================================================================

create or replace view patient_payment_summary as
  select
    p.customer_id,
    p.organization_id,
    count(*) filter (where p.status = 'paid')                         as sessions_paid,
    count(*) filter (where p.status = 'pending')                      as sessions_pending,
    coalesce(sum(p.amount) filter (where p.status = 'paid'),    0)    as total_paid,
    coalesce(sum(p.amount) filter (where p.status = 'pending'), 0)    as total_pending,
    max(p.paid_at)                                                     as last_payment_at
  from payments p
  group by p.customer_id, p.organization_id;

comment on view patient_payment_summary is 'Resumen financiero por paciente: sesiones pagadas, pendientes y totales.';
