-- Embudo propio: un evento por paso y por visitante (sesión = navegador). No guarda texto escrito ni datos personales.
create table if not exists funnel_events (
  id              bigint generated always as identity primary key,
  created_at      timestamptz not null default now(),
  session_id      text not null,
  step            text not null,
  segment         text,
  organization_id uuid references organizations(id) on delete set null,
  unique (session_id, step)
);
create index if not exists funnel_events_created_idx on funnel_events (created_at desc);
create index if not exists funnel_events_org_idx on funnel_events (organization_id) where organization_id is not null;
alter table funnel_events enable row level security;

-- Sesiones distintas por paso en el periodo
create or replace function funnel_counts(p_since timestamptz)
returns table (step text, sessions bigint)
language sql security definer set search_path = public as $$
  select step, count(distinct session_id) from funnel_events where created_at >= p_since group by step
$$;

-- Sesiones distintas por paso y giro (para ver qué giros convierten)
create or replace function funnel_by_segment(p_since timestamptz)
returns table (step text, segment text, sessions bigint)
language sql security definer set search_path = public as $$
  select step, coalesce(segment, 'sin giro'), count(distinct session_id) from funnel_events
  where created_at >= p_since and segment is not null group by step, segment
$$;

revoke all on function funnel_counts(timestamptz) from public, anon, authenticated;
revoke all on function funnel_by_segment(timestamptz) from public, anon, authenticated;
grant execute on function funnel_counts(timestamptz) to service_role;
grant execute on function funnel_by_segment(timestamptz) to service_role;
