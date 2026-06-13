-- Etapa 4: confirmación de asistencia y canal email

alter table appointments
  add column if not exists confirmation_status text
    check (confirmation_status in ('pending', 'confirmed', 'declined', 'risk'))
    default null,
  add column if not exists confirmation_sent_at timestamptz default null;

alter table customers
  add column if not exists email text default null;

comment on column appointments.confirmation_status is 'Estado de confirmación de asistencia vía WhatsApp';
comment on column appointments.confirmation_sent_at is 'Cuándo se envió la solicitud de confirmación';
comment on column customers.email is 'Correo del paciente/cliente para recordatorios';
