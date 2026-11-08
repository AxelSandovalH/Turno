-- Candado por conversación: evita que dos mensajes seguidos del cliente se procesen en paralelo
-- (respuestas duplicadas o contradictorias). Y marca de aviso de "cliente sin respuesta".
alter table conversations add column if not exists processing_until timestamptz;
alter table conversations add column if not exists unanswered_alerted_for timestamptz;
