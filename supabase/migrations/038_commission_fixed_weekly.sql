-- Comisión/pago fijo semanal para un profesional (se cobra igual sin importar cuántas consultas haga).
alter table staff drop constraint if exists staff_commission_type_check;
alter table staff add constraint staff_commission_type_check check (commission_type in ('percentage', 'fixed_per_session', 'fixed_weekly'));
comment on column staff.commission_type is 'Tipo: percentage (% sobre ingreso), fixed_per_session (monto por sesión) o fixed_weekly (monto fijo por semana)';
