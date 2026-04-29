-- Panel interno: roles ENCARGADO/VENDEDOR, columna `dni` opcional única, login por email.
-- Requiere MySQL 8.0.29+ para `ADD COLUMN IF NOT EXISTS`. Si su versión es anterior, ejecutar los ALTER manualmente.

ALTER TABLE usuarios
    MODIFY COLUMN rol ENUM('ADMIN', 'ENCARGADO', 'VENDEDOR', 'CLIENTE') NOT NULL DEFAULT 'VENDEDOR';

ALTER TABLE usuarios
    ADD COLUMN dni VARCHAR(32) NULL AFTER apellido;

-- Índice único: omitir si `uk_usuarios_dni` ya existe.
ALTER TABLE usuarios ADD UNIQUE KEY uk_usuarios_dni (dni);

-- Si existe columna `username` legada NOT NULL, permitir NULL para no enviarla en INSERT:
-- ALTER TABLE usuarios MODIFY COLUMN username VARCHAR(100) NULL DEFAULT NULL;
