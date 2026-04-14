-- Migración opcional: esquema antiguo tabla `users` (name, password, phone, role, active, created_at)
-- → OA! auth (nombre, apellido, password_hash, telefono, rol, activo, fecha_creacion).
-- Tras aplicar, renombrar `users` → `usuarios` si corresponde a tu convención actual.
-- Ejecutar sobre copia de respaldo.

START TRANSACTION;

ALTER TABLE users
    ADD COLUMN nombre VARCHAR(100) NULL AFTER id,
    ADD COLUMN apellido VARCHAR(100) NULL AFTER nombre,
    ADD COLUMN telefono VARCHAR(20) NULL AFTER email,
    ADD COLUMN password_hash VARCHAR(255) NULL AFTER telefono,
    ADD COLUMN rol ENUM('ADMIN','CLIENTE') NULL AFTER password_hash,
    ADD COLUMN activo TINYINT(1) NULL DEFAULT 1 AFTER rol,
    ADD COLUMN fecha_creacion TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP AFTER activo;

UPDATE users SET
    nombre = COALESCE(NULLIF(TRIM(SUBSTRING_INDEX(`name`, ' ', 1)), ''), `name`),
    apellido = CASE
        WHEN `name` LIKE '% %' THEN TRIM(SUBSTRING(`name`, LENGTH(SUBSTRING_INDEX(`name`, ' ', 1)) + 2))
        ELSE ''
    END,
    telefono = phone,
    password_hash = `password`,
    rol = CASE `role`
        WHEN 'ADMIN' THEN 'ADMIN'
        WHEN 'MANAGER' THEN 'ADMIN'
        ELSE 'CLIENTE'
    END,
    activo = active,
    fecha_creacion = created_at;

ALTER TABLE users
    MODIFY nombre VARCHAR(100) NOT NULL,
    MODIFY apellido VARCHAR(100) NOT NULL,
    MODIFY telefono VARCHAR(20) NULL,
    MODIFY password_hash VARCHAR(255) NOT NULL,
    MODIFY rol ENUM('ADMIN','CLIENTE') NOT NULL DEFAULT 'CLIENTE',
    MODIFY activo TINYINT(1) NOT NULL DEFAULT 1,
    MODIFY fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE users
    DROP COLUMN `name`,
    DROP COLUMN phone,
    DROP COLUMN `password`,
    DROP COLUMN `role`,
    DROP COLUMN active,
    DROP COLUMN created_at;

COMMIT;
