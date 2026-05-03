-- Si true, el público ve cantidad disponible / avisos de stock en la ficha y checkout.
ALTER TABLE event_ticket_types ADD COLUMN IF NOT EXISTS show_quantity_public BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN event_ticket_types.show_quantity_public IS 'Mostrar cupo disponible al público (ficha/checkout)';
