-- =============================================================================
-- TURNO — Initial Schema
-- =============================================================================
-- Run this in Supabase SQL Editor or via Supabase CLI migrations
-- All timestamps are stored in UTC
-- =============================================================================


-- =============================================================================
-- EXTENSIONS
-- =============================================================================

create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm"; -- for fuzzy search on customer names


-- =============================================================================
-- ENUMS
-- =============================================================================

create type subscription_status as enum (
  'trialing',
  'active',
  'past_due',
  'canceled',
  'suspended'
);

create type appointment_status as enum (
  'confirmed',
  'completed',
  'cancelled',
  'no_show'
);

create type staff_role as enum (
  'owner',
  'manager',
  'staff'
);

create type actor_type as enum (
  'user',
  'bot',
  'system'
);

create type message_role as enum (
  'user',
  'assistant'
);

create type conversation_status as enum (
  'active',
  'closed'
);

create type cancelled_by as enum (
  'customer',
  'staff',
  'system'
);


-- =============================================================================
-- ORGANIZATIONS (tenants)
-- =============================================================================

create table organizations (
  id                     uuid primary key default gen_random_uuid(),
  name                   text not null,
  slug                   text unique not null,
  whatsapp_number        text unique not null,
  phone                  text,
  email                  text,
  address                text,
  timezone               text not null default 'America/Mexico_City',
  welcome_message        text,           -- mensaje de bienvenida del bot
  away_message           text,           -- mensaje fuera de horario

  -- Stripe
  stripe_customer_id     text unique,
  stripe_subscription_id text unique,
  subscription_status    subscription_status not null default 'trialing',
  trial_ends_at          timestamptz,
  suspended_at           timestamptz,

  is_active              boolean not null default true,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

comment on table organizations is 'One row per business (tenant). The whatsapp_number is the key used to route incoming messages.';


-- =============================================================================
-- BRANCHES (sucursales)
-- =============================================================================

create table branches (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name            text not null,
  address         text,
  phone           text,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table branches is 'MVP: one branch per organization. Multi-branch is a v2 feature.';


-- =============================================================================
-- SERVICES
-- =============================================================================

create table services (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations(id) on delete cascade,
  name             text not null,
  description      text,
  duration_minutes int  not null check (duration_minutes > 0),
  price            numeric(10, 2) check (price >= 0),
  is_active        boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

comment on table services is 'Services offered by the business (e.g. "Corte", "Corte + Barba").';


-- =============================================================================
-- STAFF
-- =============================================================================

create table staff (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  branch_id       uuid references branches(id) on delete set null,
  user_id         uuid references auth.users(id) on delete set null,
  name            text not null,
  phone           text,
  avatar_url      text,
  role            staff_role not null default 'staff',
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table staff is 'Employees of the business. user_id is null for staff who have no dashboard access.';


-- =============================================================================
-- STAFF SCHEDULES (weekly recurring hours)
-- =============================================================================

create table staff_schedules (
  id           uuid primary key default gen_random_uuid(),
  staff_id     uuid not null references staff(id) on delete cascade,
  day_of_week  int  not null check (day_of_week between 0 and 6), -- 0=Sunday, 6=Saturday
  start_time   time not null,
  end_time     time not null,
  is_working   boolean not null default true,
  created_at   timestamptz not null default now(),

  unique (staff_id, day_of_week)
);

comment on table staff_schedules is 'Recurring weekly availability per staff member. day_of_week: 0=Sun, 1=Mon … 6=Sat.';


-- =============================================================================
-- TIME BLOCKS (vacations, breaks, one-off closures)
-- =============================================================================

create table time_blocks (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  staff_id        uuid references staff(id) on delete cascade, -- null = entire business closed
  starts_at       timestamptz not null,
  ends_at         timestamptz not null,
  reason          text,
  created_at      timestamptz not null default now(),

  check (ends_at > starts_at)
);

comment on table time_blocks is 'One-off blocks: vacations, lunch breaks, holidays. staff_id=null means the whole branch is closed.';


-- =============================================================================
-- CUSTOMERS
-- =============================================================================

create table customers (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name            text,
  phone           text not null,  -- WhatsApp number (E.164 format, e.g. 521XXXXXXXXXX)
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  unique (organization_id, phone)
);

comment on table customers is 'Customers per tenant. A phone number can exist in multiple tenants.';


-- =============================================================================
-- APPOINTMENTS
-- =============================================================================

create table appointments (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid not null references organizations(id) on delete cascade,
  branch_id           uuid references branches(id) on delete set null,
  customer_id         uuid not null references customers(id) on delete restrict,
  staff_id            uuid not null references staff(id) on delete restrict,
  service_id          uuid not null references services(id) on delete restrict,
  starts_at           timestamptz not null,
  ends_at             timestamptz not null,
  status              appointment_status not null default 'confirmed',
  cancelled_by        cancelled_by,
  cancellation_reason text,
  notes               text,
  reminder_sent_at    timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  check (ends_at > starts_at)
);

comment on table appointments is 'Core booking record. starts_at/ends_at are UTC; convert on display using organization.timezone.';

-- Prevent double-booking the same staff member
create unique index appointments_no_overlap_idx
  on appointments (staff_id, starts_at)
  where status = 'confirmed';


-- =============================================================================
-- CONVERSATIONS (WhatsApp threads)
-- =============================================================================

create table conversations (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  customer_id     uuid references customers(id) on delete set null,
  whatsapp_phone  text not null,
  status          conversation_status not null default 'active',
  last_message_at timestamptz,
  created_at      timestamptz not null default now(),

  unique (organization_id, whatsapp_phone)
);

comment on table conversations is 'One conversation per (organization, customer phone). Reused across sessions.';


-- =============================================================================
-- MESSAGES
-- =============================================================================

create table messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  role            message_role not null,
  content         text not null,
  ultramsg_id     text,           -- dedup key from UltraMsg webhook
  created_at      timestamptz not null default now()
);

comment on table messages is 'Chat history per conversation. Used as context window for Claude. Retain 90 days.';

-- Dedup incoming webhooks
create unique index messages_ultramsg_id_idx
  on messages (ultramsg_id)
  where ultramsg_id is not null;


-- =============================================================================
-- AUDIT LOG
-- =============================================================================

create table audit_logs (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  actor_id        uuid,           -- auth.users id or null for bot/system
  actor_type      actor_type not null,
  action          text not null,  -- e.g. 'appointment.created', 'appointment.cancelled'
  resource_type   text,           -- e.g. 'appointment'
  resource_id     uuid,
  metadata        jsonb,
  created_at      timestamptz not null default now()
);

comment on table audit_logs is 'Immutable event log. Never update or delete rows here.';


-- =============================================================================
-- INDEXES
-- =============================================================================

-- Organizations
create index on organizations (whatsapp_number);
create index on organizations (stripe_customer_id);
create index on organizations (stripe_subscription_id);

-- Branches
create index on branches (organization_id);

-- Services
create index on services (organization_id);

-- Staff
create index on staff (organization_id);
create index on staff (user_id);

-- Staff schedules
create index on staff_schedules (staff_id);

-- Time blocks
create index on time_blocks (organization_id, starts_at, ends_at);
create index on time_blocks (staff_id, starts_at, ends_at);

-- Customers
create index on customers (organization_id, phone);

-- Appointments
create index on appointments (organization_id, starts_at);
create index on appointments (staff_id, starts_at);
create index on appointments (customer_id);
create index on appointments (status);

-- Conversations
create index on conversations (organization_id, whatsapp_phone);

-- Messages
create index on messages (conversation_id, created_at);

-- Audit
create index on audit_logs (organization_id, created_at);
create index on audit_logs (resource_type, resource_id);


-- =============================================================================
-- UPDATED_AT TRIGGER
-- =============================================================================

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at before update on organizations
  for each row execute function set_updated_at();

create trigger set_updated_at before update on branches
  for each row execute function set_updated_at();

create trigger set_updated_at before update on services
  for each row execute function set_updated_at();

create trigger set_updated_at before update on staff
  for each row execute function set_updated_at();

create trigger set_updated_at before update on customers
  for each row execute function set_updated_at();

create trigger set_updated_at before update on appointments
  for each row execute function set_updated_at();


-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

alter table organizations    enable row level security;
alter table branches         enable row level security;
alter table services         enable row level security;
alter table staff            enable row level security;
alter table staff_schedules  enable row level security;
alter table time_blocks      enable row level security;
alter table customers        enable row level security;
alter table appointments     enable row level security;
alter table conversations    enable row level security;
alter table messages         enable row level security;
alter table audit_logs       enable row level security;


-- Helper function: returns the organization_id for the current user
-- Stored in user metadata during signup/onboarding
create or replace function public.current_organization_id()
returns uuid language sql stable security definer as $$
  select (auth.jwt() -> 'user_metadata' ->> 'organization_id')::uuid;
$$;


-- ORGANIZATIONS: users can only read/write their own org
create policy "org_select" on organizations
  for select using (id = public.current_organization_id());

create policy "org_update" on organizations
  for update using (id = public.current_organization_id());


-- BRANCHES
create policy "branches_all" on branches
  for all using (organization_id = public.current_organization_id());

-- SERVICES
create policy "services_all" on services
  for all using (organization_id = public.current_organization_id());

-- STAFF
create policy "staff_all" on staff
  for all using (organization_id = public.current_organization_id());

-- STAFF SCHEDULES
create policy "staff_schedules_all" on staff_schedules
  for all using (
    staff_id in (
      select id from staff where organization_id = public.current_organization_id()
    )
  );

-- TIME BLOCKS
create policy "time_blocks_all" on time_blocks
  for all using (organization_id = public.current_organization_id());

-- CUSTOMERS
create policy "customers_all" on customers
  for all using (organization_id = public.current_organization_id());

-- APPOINTMENTS
create policy "appointments_all" on appointments
  for all using (organization_id = public.current_organization_id());

-- CONVERSATIONS
create policy "conversations_all" on conversations
  for all using (organization_id = public.current_organization_id());

-- MESSAGES
create policy "messages_all" on messages
  for all using (organization_id = public.current_organization_id());

-- AUDIT LOGS: read-only for users, insert only via service role
create policy "audit_logs_select" on audit_logs
  for select using (organization_id = public.current_organization_id());


-- =============================================================================
-- SERVICE ROLE BYPASS (for Next.js API routes using service_role key)
-- =============================================================================
-- API routes use the service_role key which bypasses RLS.
-- RLS is the safety net for direct client access only.
-- Never expose the service_role key to the browser.


-- =============================================================================
-- SEED: default data helpers
-- =============================================================================

-- Call this function after creating an organization to set up default branch
create or replace function create_default_branch(org_id uuid, org_name text)
returns uuid language plpgsql security definer as $$
declare
  branch_id uuid;
begin
  insert into branches (organization_id, name)
  values (org_id, org_name)
  returning id into branch_id;

  return branch_id;
end;
$$;
