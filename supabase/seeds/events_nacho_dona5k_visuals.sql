-- Personaliza la página /carrera/dona5k: paquetes de inscripción y galería de la edición anterior. Correr después de la migración 058.
-- Para cambiar o agregar paquetes edita el arreglo "packages" (name, price en MXN, includes) y vuelve a correrlo.
update public.events set
  organizer = 'Un Día Para Donar · UDEC',
  packages = '[
    {"name": "Corredor", "price": 150, "includes": ["Participación en los 5K", "Medalla de finalista", "Puntos de hidratación", "Ambientación musical"]}
  ]'::jsonb,
  gallery = '[
    {"src": "/events/dona5k/IMG_0114.jpg", "alt": "Voluntarios en el arco de globos"},
    {"src": "/events/dona5k/DSC_0253.jpg", "alt": "Corredoras celebrando en la meta"},
    {"src": "/events/dona5k/IMG_9968.jpg", "alt": "Corredoras con su medalla"},
    {"src": "/events/dona5k/IMG_9996.jpg", "alt": "Corredores en la ruta"},
    {"src": "/events/dona5k/IMG_0043.jpg", "alt": "Presentación en Los Arcos"},
    {"src": "/events/dona5k/IMG_0055.jpg", "alt": "Corredores con sus medallas"},
    {"src": "/events/dona5k/IMG_9833.jpg", "alt": "Salida de la carrera"},
    {"src": "/events/dona5k/IMG_9791.jpg", "alt": "Corredores en la avenida"},
    {"src": "/events/dona5k/IMG_9871.jpg", "alt": "Arco de salida"},
    {"src": "/events/dona5k/IMG_0019.jpg", "alt": "Ambiente en la meta"}
  ]'::jsonb
where slug = 'dona5k';
