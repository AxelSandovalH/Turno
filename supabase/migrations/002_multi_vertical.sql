-- =============================================================================
-- TURNO — Multi-Vertical Expansion
-- Adds support for: Barbershops, Psychology, Dentistry, Physiotherapy
-- =============================================================================


-- =============================================================================
-- NEW ENUMS
-- =============================================================================

create type business_type as enum (
  'barbershop',
  'psychology',
  'dentistry',
  'physiotherapy',
  'other'
);

create type patient_gender as enum (
  'male',
  'female',
  'other',
  'prefer_not_to_say'
);

create type treatment_plan_status as enum (
  'active',
  'completed',
  'paused',
  'cancelled'
);

create type note_type as enum (
  'session',      -- psychology: session notes
  'soap',         -- physiotherapy: Subjective/Objective/Assessment/Plan
  'clinical',     -- dentistry: clinical observations
  'evolution',    -- general evolution note
  'intake'        -- first visit intake notes
);

create type appointment_modality as enum (
  'in_person',
  'online',
  'home_visit'
);


-- =============================================================================
-- EXTEND ORGANIZATIONS — add business_type
-- =============================================================================

alter table organizations
  add column if not exists business_type business_type not null default 'barbershop',
  add column if not exists booking_link   text,           -- public booking page slug
  add column if not exists cancellation_policy_hours int default 24,
  add column if not exists default_modality appointment_modality default 'in_person';

comment on column organizations.business_type is 'Vertical this org belongs to. Drives UI labels and feature flags.';
comment on column organizations.cancellation_policy_hours is 'Hours before appointment after which cancellation is not allowed.';


-- =============================================================================
-- EXTEND CUSTOMERS → patient fields
-- Customers table is shared; health fields are nullable so barbershops are unaffected
-- =============================================================================

alter table customers
  add column if not exists date_of_birth        date,
  add column if not exists gender               patient_gender,
  add column if not exists occupation           text,
  add column if not exists allergies            text,            -- free text, comma-separated
  add column if not exists medical_notes        text,            -- general medical background
  add column if not exists emergency_contact    text,            -- name
  add column if not exists emergency_phone      text,
  add column if not exists referred_by          text,            -- how they found the practice
  add column if not exists is_active            boolean not null default true;

comment on column customers.date_of_birth    is 'Used for age calculation and patient records.';
comment on column customers.allergies        is 'Comma-separated list. Shown as warning before appointment.';
comment on column customers.medical_notes    is 'Background medical history — intake notes.';
comment on column customers.emergency_contact is 'Name of emergency contact person.';


-- =============================================================================
-- EXTEND STAFF — specialties and credentials
-- =============================================================================

alter table staff
  add column if not exists specialty          text,            -- e.g. "Ortodoncia", "Fisioterapia deportiva", "Ansiedad y depresión"
  add column if not exists license_number     text,            -- Cédula profesional (Mexico)
  add column if not exists bio                text,            -- short profile shown to patients
  add column if not exists online_meeting_url text;            -- Zoom/Meet link for online sessions

comment on column staff.license_number is 'Cédula profesional o número de licencia. Shown on invoices/receipts.';
comment on column staff.online_meeting_url is 'Default meeting link for online appointments with this staff member.';


-- =============================================================================
-- EXTEND APPOINTMENTS — modality + online link
-- =============================================================================

alter table appointments
  add column if not exists modality         appointment_modality not null default 'in_person',
  add column if not exists meeting_url      text,            -- override per-appointment if different from staff default
  add column if not exists session_number   int,             -- which session in a treatment plan (1, 2, 3…)
  add column if not exists treatment_plan_id uuid;           -- linked to treatment_plans (FK added after table creation)

comment on column appointments.session_number is 'Ordinal session within a treatment plan. Null for one-off appointments.';
comment on column appointments.modality       is 'Delivery mode: in-person, online, or home visit.';


-- =============================================================================
-- TREATMENT PLANS (Physiotherapy, Psychology, Dentistry)
-- A plan groups multiple appointments under a shared goal/diagnosis
-- =============================================================================

create table treatment_plans (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  customer_id     uuid not null references customers(id) on delete restrict,
  staff_id        uuid references staff(id) on delete set null,
  title           text not null,                  -- e.g. "Rehabilitación rodilla derecha"
  diagnosis       text,                           -- ICD code or free text
  goals           text,                           -- treatment objectives
  total_sessions  int,                            -- planned number of sessions (null = open-ended)
  sessions_done   int not null default 0,
  status          treatment_plan_status not null default 'active',
  starts_at       date,
  ends_at         date,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table treatment_plans is 'Groups a series of appointments under one clinical plan. Used by physio, psychology, dentistry.';

-- Now add FK from appointments to treatment_plans
alter table appointments
  add constraint appointments_treatment_plan_fk
  foreign key (treatment_plan_id) references treatment_plans(id) on delete set null;


-- =============================================================================
-- APPOINTMENT NOTES (Clinical / Session notes per appointment)
-- =============================================================================

create table appointment_notes (
  id              uuid primary key default gen_random_uuid(),
  appointment_id  uuid not null references appointments(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  staff_id        uuid references staff(id) on delete set null,
  note_type       note_type not null default 'evolution',

  -- SOAP fields (physiotherapy)
  soap_subjective text,   -- patient-reported symptoms
  soap_objective  text,   -- measurable clinical findings
  soap_assessment text,   -- diagnosis/assessment
  soap_plan       text,   -- next steps / treatment plan update

  -- Generic content (psychology session notes, dentistry clinical notes)
  content         text,

  -- Vitals (optional, useful for physio)
  pain_level      int check (pain_level between 0 and 10),
  blood_pressure  text,   -- e.g. "120/80"
  heart_rate      int,
  weight_kg       numeric(5,2),

  is_private      boolean not null default false,  -- private notes, not shown to patient
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table appointment_notes is 'Clinical notes per appointment. Supports SOAP (physio), session notes (psychology), and clinical notes (dentistry).';


-- =============================================================================
-- DENTAL CHART (Dentistry-specific)
-- Tracks per-tooth observations and treatments
-- =============================================================================

create table dental_chart_entries (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  customer_id     uuid not null references customers(id) on delete cascade,
  appointment_id  uuid references appointments(id) on delete set null,
  tooth_number    int not null check (tooth_number between 1 and 52),  -- FDI / Universal notation
  condition       text not null,   -- e.g. "caries", "corona", "extracción", "obturación"
  surface         text,            -- e.g. "mesial", "distal", "oclusal", "bucal", "lingual"
  notes           text,
  recorded_at     timestamptz not null default now(),
  created_at      timestamptz not null default now()
);

comment on table dental_chart_entries is 'Per-tooth clinical record. tooth_number uses FDI notation (1-32 permanent, 51-85 primary). Dentistry vertical only.';


-- =============================================================================
-- PSYCHOLOGY INTAKE (Psychology-specific)
-- Structured intake form filled on first session
-- =============================================================================

create table psychology_intakes (
  id                    uuid primary key default gen_random_uuid(),
  organization_id       uuid not null references organizations(id) on delete cascade,
  customer_id           uuid not null references customers(id) on delete cascade,
  staff_id              uuid references staff(id) on delete set null,

  -- Reason & background
  chief_complaint       text,   -- main reason for seeking help
  symptom_onset         text,   -- when did symptoms start
  previous_therapy      boolean,
  previous_therapy_notes text,
  current_medications   text,
  sleep_quality         text,
  substance_use         text,

  -- Mental health screening (PHQ-9 / GAD-7 scores optional)
  phq9_score            int check (phq9_score between 0 and 27),   -- depression screen
  gad7_score            int check (gad7_score between 0 and 21),   -- anxiety screen

  -- Goals
  therapy_goals         text,
  additional_notes      text,

  completed_at          timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  unique (customer_id, organization_id)  -- one intake per patient per org
);

comment on table psychology_intakes is 'Structured intake form for psychology patients. Includes PHQ-9/GAD-7 scores and therapy goals.';


-- =============================================================================
-- INDEXES
-- =============================================================================

create index on treatment_plans (organization_id, status);
create index on treatment_plans (customer_id);
create index on treatment_plans (staff_id);

create index on appointment_notes (appointment_id);
create index on appointment_notes (organization_id, created_at);

create index on dental_chart_entries (customer_id, tooth_number);
create index on dental_chart_entries (organization_id);

create index on psychology_intakes (customer_id);
create index on psychology_intakes (organization_id);

create index on organizations (business_type);
create index on appointments (treatment_plan_id);


-- =============================================================================
-- UPDATED_AT TRIGGERS
-- =============================================================================

create trigger set_updated_at before update on treatment_plans
  for each row execute function set_updated_at();

create trigger set_updated_at before update on appointment_notes
  for each row execute function set_updated_at();

create trigger set_updated_at before update on psychology_intakes
  for each row execute function set_updated_at();


-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

alter table treatment_plans      enable row level security;
alter table appointment_notes    enable row level security;
alter table dental_chart_entries enable row level security;
alter table psychology_intakes   enable row level security;

create policy "treatment_plans_all" on treatment_plans
  for all using (organization_id = public.current_organization_id());

create policy "appointment_notes_all" on appointment_notes
  for all using (organization_id = public.current_organization_id());

create policy "dental_chart_all" on dental_chart_entries
  for all using (organization_id = public.current_organization_id());

create policy "psychology_intakes_all" on psychology_intakes
  for all using (organization_id = public.current_organization_id());


-- =============================================================================
-- HELPER VIEW — next appointment per patient (useful for dashboard)
-- =============================================================================

create or replace view patient_next_appointment as
  select distinct on (a.customer_id, a.organization_id)
    a.customer_id,
    a.organization_id,
    a.id            as appointment_id,
    a.starts_at,
    a.modality,
    s.name          as staff_name,
    sv.name         as service_name
  from appointments a
  join staff    s  on s.id  = a.staff_id
  join services sv on sv.id = a.service_id
  where a.status = 'confirmed'
    and a.starts_at > now()
  order by a.customer_id, a.organization_id, a.starts_at asc;

comment on view patient_next_appointment is 'Convenience view: next upcoming confirmed appointment per patient.';
