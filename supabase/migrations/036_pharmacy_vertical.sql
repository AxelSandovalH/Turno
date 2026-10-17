-- Agrega el giro "pharmacy" (farmacia: citas de servicios + pedidos de productos) al enum business_type.
-- Corre este archivo solo, antes de registrar la farmacia.
alter type business_type add value if not exists 'pharmacy';
