-- Adelanto configurable por mesa (% del total con gastos al reservar online). 100 = pago completo.
ALTER TABLE venue_tables ADD COLUMN IF NOT EXISTS initial_payment_percent INTEGER;

UPDATE venue_tables
SET initial_payment_percent = 50
WHERE initial_payment_percent IS NULL;

ALTER TABLE venue_tables ALTER COLUMN initial_payment_percent SET DEFAULT 50;

-- Opcional: NOT NULL tras backfill
-- ALTER TABLE venue_tables ALTER COLUMN initial_payment_percent SET NOT NULL;

COMMENT ON COLUMN venue_tables.initial_payment_percent IS 'Porcentaje del total a cobrar al reservar (1-100). 100 = pago completo online.';
