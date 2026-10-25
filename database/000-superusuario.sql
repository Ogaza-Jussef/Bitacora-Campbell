-- Ejecutar como root en 127.0.0.1:3307 (conexión local7 de MySQL Workbench).
-- Crea el usuario de la aplicación con control total de bitacora_campbell.
-- La contraseña real está en .env (DATABASE_URL) y en database/local/instalar.sql.
-- No uses esta plantilla tal cual: CAMBIAR no es la clave del entorno local.

CREATE DATABASE IF NOT EXISTS bitacora_campbell
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'bitacora_admin'@'127.0.0.1' IDENTIFIED BY 'CAMBIAR';
CREATE USER IF NOT EXISTS 'bitacora_admin'@'localhost' IDENTIFIED BY 'CAMBIAR';

ALTER USER 'bitacora_admin'@'127.0.0.1' IDENTIFIED BY 'CAMBIAR';
ALTER USER 'bitacora_admin'@'localhost' IDENTIFIED BY 'CAMBIAR';

GRANT ALL PRIVILEGES ON bitacora_campbell.* TO 'bitacora_admin'@'127.0.0.1';
GRANT ALL PRIVILEGES ON bitacora_campbell.* TO 'bitacora_admin'@'localhost';

FLUSH PRIVILEGES;
