-- Autorización explícita del local: sin esto, el evento no lista en /collage ni se muestran recuerdos al público
ALTER TABLE events ADD COLUMN IF NOT EXISTS collage_authorized BOOLEAN NOT NULL DEFAULT false;

-- Eventos ya finalizados y marcados para collage: se consideran autorizados (no desaparecen al actualizar)
UPDATE events
SET collage_authorized = true
WHERE end_at < NOW() AND include_in_collage = true;
