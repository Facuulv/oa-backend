-- OA! — índices útiles para filtros del panel admin (productos)
-- Ejecutar una sola vez. Si un índice ya existe, omitir solo esa sentencia.

CREATE INDEX idx_productos_activo ON productos (activo);
CREATE INDEX idx_productos_destacado ON productos (destacado);
CREATE INDEX idx_productos_nombre ON productos (nombre);
