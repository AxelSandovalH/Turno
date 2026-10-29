-- Cobro automático: el bot manda solo el link de Stripe de citas y pedidos (importe calculado por el sistema).
-- Los cobros libres (request_payment_link) siguen necesitando la aprobación del responsable.
alter table organizations add column if not exists payment_auto_send boolean not null default false;

update organizations set payment_auto_send = true
where business_type = 'pharmacy' and (slug = 'cabo-pharmacy' or name ilike '%CMC%' or name ilike '%cabo%');
