  -- Pagos de la farmacia: efectivo contra entrega, cargo por tarjeta y tiempo de entrega por defecto.
  alter table organizations
    add column if not exists order_cash_enabled boolean not null default false,
    add column if not exists order_card_fee_pct numeric(5, 2) not null default 0,
    add column if not exists order_eta_minutes int not null default 30;
  alter table orders add column if not exists card_fee numeric(10, 2) not null default 0;
  -- Un link de pago pedido por el bot puede corresponder a un pedido (se aprueba con SI/NO antes de enviarse)
  alter table payment_link_requests add column if not exists order_id uuid references orders(id) on delete set null;
  update organizations set name = 'CMC Pharmacy', order_cash_enabled = true, order_card_fee_pct = 8, order_eta_minutes = 30 where slug = 'cabo-pharmacy';
