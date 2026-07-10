-- Anticipos vía Stripe: el negocio puede pedir un pago fijo al agendar por
-- WhatsApp. La cita se crea de inmediato (bloquea el horario) pero queda
-- deposit_status='pending' hasta que el cliente paga o expira (cron externo).

alter table public.organizations
  add column if not exists deposit_enabled boolean not null default false,
  add column if not exists deposit_amount numeric not null default 0 check (deposit_amount >= 0);

alter table public.appointments
  add column if not exists deposit_status text not null default 'none'
    check (deposit_status in ('none', 'pending', 'paid')),
  add column if not exists deposit_amount numeric,
  add column if not exists stripe_checkout_session_id text,
  add column if not exists deposit_checkout_url text,
  add column if not exists deposit_expires_at timestamptz,
  add column if not exists deposit_paid_at timestamptz;

comment on column public.organizations.deposit_enabled is 'Si true, el bot pide anticipo por Stripe al agendar por WhatsApp.';
comment on column public.organizations.deposit_amount is 'Monto fijo del anticipo en MXN.';
comment on column public.appointments.deposit_status is 'none = sin anticipo requerido; pending = link enviado, sin pagar; paid = confirmado.';
