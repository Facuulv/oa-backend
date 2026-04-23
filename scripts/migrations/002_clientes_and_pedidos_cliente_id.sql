-- Clientes de tienda y columna `pedidos.cliente_id`.
-- Ejecutar una sola vez sobre BD existente. Si `cliente_id` ya existe, omitir los ALTER.

USE sistema_oa;

CREATE TABLE IF NOT EXISTS clientes (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    nombre              VARCHAR(100)    NOT NULL,
    apellido            VARCHAR(100)    NOT NULL,
    email               VARCHAR(150)    NOT NULL UNIQUE,
    telefono            VARCHAR(20)     NULL,
    password_hash       VARCHAR(255)    NOT NULL,
    activo              TINYINT(1)      NOT NULL DEFAULT 1,
    fecha_creacion      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_modificacion  TIMESTAMP       NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

ALTER TABLE pedidos
    ADD COLUMN cliente_id INT NULL AFTER usuario_id;

ALTER TABLE pedidos
    ADD CONSTRAINT fk_pedidos_cliente FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE SET NULL;
