-- Ejecutar una vez en PostgreSQL si la columna status ya existe sin 'paused':
-- psql $DATABASE_URL -f scripts/add-paused-event-status.sql

ALTER TYPE enum_events_status ADD VALUE IF NOT EXISTS 'paused';
