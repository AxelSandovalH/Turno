-- Etapa 3: configuración de comisiones por terapeuta y precio por sesión en planes

alter table staff
  add column if not exists commission_type text
    check (commission_type in ('percentage', 'fixed_per_session'))
    default 'percentage',
  add column if not exists commission_value numeric(6,2) default 0;

alter table treatment_plans
  add column if not exists price_per_session numeric(8,2) default null;

comment on column staff.commission_type is 'Tipo de comisión: percentage (% sobre ingreso) o fixed_per_session (monto fijo por sesión)';
comment on column staff.commission_value is 'Valor de la comisión: porcentaje (0-100) o monto fijo en MXN';
comment on column treatment_plans.price_per_session is 'Precio pactado por sesión dentro del plan de tratamiento';
