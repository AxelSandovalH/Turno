-- Cobro con tarjeta en pedidos (Stripe Checkout). Un pedido con tarjeta se crea
-- sin pagar y NO aparece en el tablero del negocio hasta que el webhook de
-- Stripe confirma el pago.
alter table organizations
  add column if not exists order_card_enabled boolean not null default false;

alter table orders
  add column if not exists payment_status text not null default 'unpaid'
    check (payment_status in ('unpaid', 'paid', 'refunded')),
  add column if not exists paid_at timestamptz,
  add column if not exists stripe_checkout_session_id text,
  add column if not exists stripe_payment_intent_id text;

-- Efectivo y transferencia se cobran en la entrega: no pasan por Stripe
alter table orders drop constraint if exists orders_payment_method_check;
alter table orders add constraint orders_payment_method_check
  check (payment_method in ('cash', 'transfer', 'card'));

create index if not exists orders_checkout_session_idx on orders (stripe_checkout_session_id);
