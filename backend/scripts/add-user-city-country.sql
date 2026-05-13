-- Ciudad y país en perfil de usuario (registro). Ejecutar una vez en PostgreSQL.
ALTER TABLE users ADD COLUMN city VARCHAR(255);
ALTER TABLE users ADD COLUMN country VARCHAR(255);
