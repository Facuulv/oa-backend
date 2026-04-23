-- OA! — quitar columna legacy `controla_stock` si existía en tu base.
-- Ejecutar solo si migraste con una versión anterior que agregaba esa columna.
-- Si MySQL responde "Unknown column", no hace falta ejecutar este archivo.

ALTER TABLE productos DROP COLUMN controla_stock;
