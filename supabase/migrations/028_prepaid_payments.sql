-- Prepago con OXXO / transferencia SPEI: el cliente paga 1 o 3 meses por adelantado,
-- no hay renovación automática. El acceso dura hasta paid_until.
alter table organizations
  add column if not exists payment_mode text not null default 'subscription'
    check (payment_mode in ('subscription', 'prepaid')),
  add column if not exists paid_until timestamptz,
  add column if not exists prepaid_reminder_sent_at timestamptz,
  add column if not exists last_prepaid_session_id text;   -- evita activar dos veces el mismo pago
