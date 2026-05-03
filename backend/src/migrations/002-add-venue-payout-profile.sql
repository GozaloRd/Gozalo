-- Requiere PostgreSQL. Añade almacenamiento de datos bancarios / instrucciones de pago del local.
ALTER TABLE venues
  ADD COLUMN IF NOT EXISTS payout_profile JSONB;
