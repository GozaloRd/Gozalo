-- Ejecutar una vez en PostgreSQL si la columna no existe (metadatos del asistente móvil).
ALTER TABLE events ADD COLUMN IF NOT EXISTS wizard_meta JSONB;
