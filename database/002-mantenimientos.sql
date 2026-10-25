-- Mantenimientos preventivos y correctivos. Ejecutar en bitacora_campbell.
-- Idempotente: se puede correr más de una vez.

USE bitacora_campbell;

CREATE TABLE IF NOT EXISTS equipos (
  id INT NOT NULL AUTO_INCREMENT,
  descripcion VARCHAR(255) NOT NULL,
  area_id INT NOT NULL,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_equipos_descripcion_area (descripcion, area_id),
  KEY idx_equipos_area (area_id),
  CONSTRAINT fk_equipos_area FOREIGN KEY (area_id) REFERENCES areas (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS mantenimientos_preventivos (
  id BIGINT NOT NULL AUTO_INCREMENT,
  fecha_programacion DATE NOT NULL,
  area_id INT NOT NULL,
  equipo_id INT NOT NULL,
  estado ENUM('Programado', 'Realizado', 'No realizado') NOT NULL DEFAULT 'Programado',
  observaciones TEXT NULL,
  version INT NOT NULL DEFAULT 1,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME NULL,
  PRIMARY KEY (id),
  KEY idx_preventivos_fecha (fecha_programacion, id),
  KEY idx_preventivos_area (area_id, fecha_programacion),
  KEY idx_preventivos_estado (estado, fecha_programacion),
  CONSTRAINT fk_preventivos_area FOREIGN KEY (area_id) REFERENCES areas (id),
  CONSTRAINT fk_preventivos_equipo FOREIGN KEY (equipo_id) REFERENCES equipos (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS mantenimientos_correctivos (
  id BIGINT NOT NULL AUTO_INCREMENT,
  area_id INT NOT NULL,
  equipo_id INT NOT NULL,
  soporte_id VARCHAR(20) NULL,
  estado ENUM('Pendiente', 'En proceso', 'Resuelto') NOT NULL DEFAULT 'Pendiente',
  fecha DATE NOT NULL,
  observaciones TEXT NULL,
  version INT NOT NULL DEFAULT 1,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME NULL,
  PRIMARY KEY (id),
  KEY idx_correctivos_fecha (fecha, id),
  KEY idx_correctivos_area (area_id, fecha),
  KEY idx_correctivos_estado (estado, fecha),
  KEY idx_correctivos_soporte (soporte_id),
  CONSTRAINT fk_correctivos_area FOREIGN KEY (area_id) REFERENCES areas (id),
  CONSTRAINT fk_correctivos_equipo FOREIGN KEY (equipo_id) REFERENCES equipos (id),
  CONSTRAINT fk_correctivos_soporte FOREIGN KEY (soporte_id) REFERENCES soportes (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
