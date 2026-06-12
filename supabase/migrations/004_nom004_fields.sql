-- =============================================================================
-- TURNO — NOM-004 campos faltantes
-- CURP, RFC, tipo de sangre, diagnóstico principal CIE-10
-- =============================================================================

alter table customers
  add column if not exists curp              text,           -- Clave Única de Registro de Población
  add column if not exists rfc               text,           -- RFC para facturación
  add column if not exists blood_type        text,           -- 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'
  add column if not exists main_diagnosis    text;           -- Diagnóstico principal, código CIE-10 o texto libre

comment on column customers.curp           is 'CURP del paciente — requerido por NOM-004 para expediente clínico electrónico.';
comment on column customers.rfc            is 'RFC del paciente — usado para facturación electrónica (CFDI).';
comment on column customers.blood_type     is 'Tipo de sangre del paciente. Ej: O+, A-, AB+';
comment on column customers.main_diagnosis is 'Diagnóstico principal en código CIE-10 o texto libre. Ej: M54.5 Lumbalgia.';
