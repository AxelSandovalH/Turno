-- Foto opcional por servicio (tours, charters, etc.). Se sube a Storage
-- (bucket org-assets, carpeta services/) y aquí se guarda la URL pública.
alter table services add column if not exists image_url text;
