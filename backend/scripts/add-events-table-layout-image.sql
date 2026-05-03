-- Plano / foto de referencia de mesas (subida en el wizard, paso Mesas).
ALTER TABLE events ADD COLUMN IF NOT EXISTS table_layout_image_url VARCHAR(2048);

COMMENT ON COLUMN events.table_layout_image_url IS 'URL del plano o foto del salón para reservas de mesa';
