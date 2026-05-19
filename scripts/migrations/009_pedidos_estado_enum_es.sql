-- Referencia: ENUM español de `pedidos.estado` (alineado con producción).
-- No ejecutar si la columna ya tiene estos valores.
-- Instalaciones nuevas: usar scripts/schema.sql.

USE sistema_oa;

-- Ejemplo solo si la BD aún tiene valores en inglés (ajustar según SHOW COLUMNS FROM pedidos):
-- ALTER TABLE pedidos
--     MODIFY COLUMN estado ENUM('PENDIENTE','CONFIRMADO','ENTREGADO','CANCELADO') NOT NULL DEFAULT 'PENDIENTE';
