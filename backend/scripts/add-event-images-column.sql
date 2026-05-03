-- Galería de fotos por evento (PostgreSQL JSONB)
ALTER TABLE events ADD COLUMN IF NOT EXISTS images JSONB DEFAULT NULL;
