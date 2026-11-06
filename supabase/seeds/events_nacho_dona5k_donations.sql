-- Paquetes de donación de la Dona 5K. Correr después de la migración 059.
-- "kind": "donation" = aporte sin correr (también se ofrecen como extra al inscribirse). Edita nombres y montos aquí y vuelve a correrlo.
update public.events set
  packages = '[
    {"name": "Corredor", "price": 150, "includes": ["Participación en los 5K", "Medalla de finalista", "Puntos de hidratación", "Ambientación musical"]},
    {"name": "Aliado", "price": 100, "kind": "donation"},
    {"name": "Amigo", "price": 250, "kind": "donation"},
    {"name": "Héroe", "price": 500, "kind": "donation"}
  ]'::jsonb
where slug = 'dona5k';
