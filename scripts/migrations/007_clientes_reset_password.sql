ALTER TABLE clientes
    ADD COLUMN reset_password_token VARCHAR(255) NULL AFTER password_hash,
    ADD COLUMN reset_password_expira DATETIME NULL AFTER reset_password_token;

CREATE INDEX idx_clientes_reset_password_token ON clientes (reset_password_token);
