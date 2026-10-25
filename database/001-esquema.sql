-- Esquema de la bitácora de soportes. Ejecutar dentro de bitacora_campbell.

USE bitacora_campbell;

CREATE TABLE IF NOT EXISTS areas (
  id INT NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(120) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_areas_nombre (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tecnicos (
  id INT NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(120) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_tecnicos_nombre (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS usuarios (
  id INT NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(120) NOT NULL,
  email VARCHAR(180) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  rol ENUM('admin', 'soporte') NOT NULL,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_usuarios_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS soportes (
  id VARCHAR(20) NOT NULL,
  solicitante VARCHAR(180) NOT NULL,
  area_id INT NOT NULL,
  descripcion TEXT NULL,
  tipo ENUM('Chequeo', 'Instalación', 'Correctivo') NULL,
  fecha_solicitud DATE NULL,
  fecha_entrega DATE NULL,
  tiempo_soporte VARCHAR(80) NULL,
  tecnico_id INT NULL,
  actualizado_en DATETIME NULL,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  version INT NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  KEY idx_soportes_fecha (fecha_solicitud, id),
  KEY idx_soportes_area (area_id, fecha_solicitud, id),
  KEY idx_soportes_tipo (tipo, fecha_solicitud, id),
  KEY idx_soportes_tecnico (tecnico_id),
  CONSTRAINT fk_soportes_area FOREIGN KEY (area_id) REFERENCES areas (id),
  CONSTRAINT fk_soportes_tecnico FOREIGN KEY (tecnico_id) REFERENCES tecnicos (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS solicitudes_idempotentes (
  usuario_id INT NOT NULL,
  clave CHAR(64) NOT NULL,
  hash_solicitud CHAR(64) NOT NULL,
  estado_http SMALLINT NOT NULL,
  cuerpo JSON NOT NULL,
  creado_en DATETIME NOT NULL,
  PRIMARY KEY (usuario_id, clave),
  CONSTRAINT fk_idempotencia_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
