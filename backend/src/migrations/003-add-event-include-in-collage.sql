-- Incluir evento en el collage público (/collage) y recuerdos visibles al público
ALTER TABLE events ADD COLUMN IF NOT EXISTS include_in_collage BOOLEAN NOT NULL DEFAULT true;
