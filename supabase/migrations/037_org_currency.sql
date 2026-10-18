-- Moneda de cobro por negocio (pedidos con tarjeta y anticipos). Por defecto pesos; Cabo Pharmacy cobra en dólares.
alter table organizations add column if not exists currency text not null default 'mxn' check (currency in ('mxn', 'usd'));
update organizations set currency = 'usd' where slug = 'cabo-pharmacy';
