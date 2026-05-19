-- DNI obligatorio (único) y fecha de nacimiento opcional en clientes tienda

-- Backfill para clientes existentes sin DNI
UPDATE clientes
SET dni = CONCAT('LEGACY-', id)
WHERE dni IS NULL OR TRIM(dni) = '';

ALTER TABLE clientes
  MODIFY COLUMN dni VARCHAR(32) NOT NULL;
