-- Liga pagos con órdenes de laboratorio para saber si una orden ya se cobró
-- y que el cobro aparezca en Finanzas (que ya lee la tabla payments).
alter table public.payments
  add column if not exists lab_order_id uuid references public.lab_orders(id) on delete set null;

create index if not exists payments_lab_order_idx on public.payments (lab_order_id);
