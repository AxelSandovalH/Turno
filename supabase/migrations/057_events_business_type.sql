-- Giro 'events' (eventos y carreras). Correr SOLA, antes del seed: un valor nuevo del enum no se puede usar en la misma transacción.
alter type business_type add value if not exists 'events';
