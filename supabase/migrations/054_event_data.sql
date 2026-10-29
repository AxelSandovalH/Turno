-- Datos estructurados del evento (Rancho McCoy) ligados a la solicitud de pago del anticipo, para armar el contrato al pagarse.
alter table payment_link_requests add column if not exists event_data jsonb;
