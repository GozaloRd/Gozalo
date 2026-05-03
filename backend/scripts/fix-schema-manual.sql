-- Respaldo manual si hace falta (PostgreSQL).
-- psql -U postgres -d gozalo_db -f scripts/fix-schema-manual.sql

ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE venue_tables
  ADD COLUMN IF NOT EXISTS min_price DECIMAL(12, 2);

-- Si falla el sync por valores ENUM nuevos, en psql:
-- ALTER TYPE enum_reservations_status ADD VALUE 'checked_in';
-- ALTER TYPE enum_tickets_status ADD VALUE 'pending';
-- ALTER TYPE enum_tickets_status ADD VALUE 'paid';
