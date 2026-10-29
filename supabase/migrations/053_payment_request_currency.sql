  -- Moneda propia por solicitud de pago (anticipos de Rancho McCoy en MXN o USD aunque el negocio cobre en otra moneda).
  alter table payment_link_requests add column if not exists currency text check (currency in ('mxn', 'usd'));
