-- Citas con pago por adelantado: el bot aparta el horario, el responsable aprueba y el cliente paga por un link de Stripe.
alter table organizations add column if not exists appointment_prepay boolean not null default false;
alter table payment_link_requests add column if not exists appointment_id uuid references appointments(id) on delete set null;
update organizations set appointment_prepay = true where slug = 'cabo-pharmacy';
