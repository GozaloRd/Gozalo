-- Modo de venta por evento y orden de tipos (cola secuencial). Ejecutar una vez en Postgres.
ALTER TABLE events ADD COLUMN IF NOT EXISTS ticket_sale_mode VARCHAR(20) NOT NULL DEFAULT 'parallel';
ALTER TABLE event_ticket_types ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;
