-- OA! — tipo de producto (PRODUCTO | PROMOCION) y tabla de componentes para combos.
-- Ejecutar una sola vez. Idempotente: falla si la columna o tabla ya existen (ajustar manualmente).

ALTER TABLE productos
    ADD COLUMN tipo_producto ENUM('PRODUCTO', 'PROMOCION') NOT NULL DEFAULT 'PRODUCTO'
        AFTER orden;

CREATE INDEX idx_productos_tipo_producto ON productos (tipo_producto);

CREATE TABLE IF NOT EXISTS productos_componentes (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    producto_padre_id   INT             NOT NULL,
    producto_hijo_id    INT             NOT NULL,
    cantidad            INT             NOT NULL,
    fecha_creacion      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_modificacion  TIMESTAMP       NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_pc_padre FOREIGN KEY (producto_padre_id) REFERENCES productos(id) ON DELETE CASCADE,
    CONSTRAINT fk_pc_hijo FOREIGN KEY (producto_hijo_id) REFERENCES productos(id) ON DELETE RESTRICT,
    CONSTRAINT chk_pc_no_self CHECK (producto_padre_id <> producto_hijo_id),
    CONSTRAINT chk_pc_cantidad_pos CHECK (cantidad > 0),
    UNIQUE KEY uk_pc_padre_hijo (producto_padre_id, producto_hijo_id),
    KEY idx_pc_padre (producto_padre_id)
) ENGINE=InnoDB;
