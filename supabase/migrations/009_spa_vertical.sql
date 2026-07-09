-- Agrega el giro "spa" (belleza/estética) al enum business_type.
-- No es "médico": usa etiquetas de Clientes/Estilistas, sin UI clínica (SOAP, NOM-004, etc.)
alter type business_type add value if not exists 'spa';
