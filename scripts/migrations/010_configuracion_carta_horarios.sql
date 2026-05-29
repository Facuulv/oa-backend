-- Configuración carta online + horarios de atención (idempotente donde aplica)
-- Ejecutar contra la base configurada en DB_DATABASE (p. ej. sistema_oa).

CREATE TABLE IF NOT EXISTS horarios_tienda (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    dia_semana          TINYINT         NOT NULL COMMENT '0=Domingo .. 6=Sábado',
    hora_apertura       TIME            NOT NULL,
    hora_cierre         TIME            NOT NULL,
    activo              TINYINT(1)      NOT NULL DEFAULT 1,
    orden               TINYINT         NOT NULL DEFAULT 0,
    fecha_creacion      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_modificacion  TIMESTAMP       NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_horarios_dia_orden (dia_semana, orden)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Horarios por defecto (solo si la tabla está vacía): Lun–Sáb 11:00–23:00; Dom cerrado
INSERT INTO horarios_tienda (dia_semana, hora_apertura, hora_cierre, activo, orden)
SELECT * FROM (
    SELECT 1 AS dia_semana, '11:00:00' AS hora_apertura, '23:00:00' AS hora_cierre, 1 AS activo, 0 AS orden
    UNION ALL SELECT 2, '11:00:00', '23:00:00', 1, 0
    UNION ALL SELECT 3, '11:00:00', '23:00:00', 1, 0
    UNION ALL SELECT 4, '11:00:00', '23:00:00', 1, 0
    UNION ALL SELECT 5, '11:00:00', '23:00:00', 1, 0
    UNION ALL SELECT 6, '11:00:00', '23:00:00', 1, 0
) AS seed
WHERE NOT EXISTS (SELECT 1 FROM horarios_tienda LIMIT 1);

INSERT INTO configuracion_sistema (clave, valor)
SELECT 'CARTA_ONLINE_HABILITADA', 'true'
WHERE NOT EXISTS (SELECT 1 FROM configuracion_sistema WHERE clave = 'CARTA_ONLINE_HABILITADA');

INSERT INTO configuracion_sistema (clave, valor)
SELECT 'VALIDAR_HORARIOS_CHECKOUT', 'true'
WHERE NOT EXISTS (SELECT 1 FROM configuracion_sistema WHERE clave = 'VALIDAR_HORARIOS_CHECKOUT');

INSERT INTO configuracion_sistema (clave, valor)
SELECT 'WHATSAPP_PEDIDOS', '542804648174'
WHERE NOT EXISTS (SELECT 1 FROM configuracion_sistema WHERE clave = 'WHATSAPP_PEDIDOS');

INSERT INTO configuracion_sistema (clave, valor)
SELECT 'EMAIL_RECUPERACION_NOMBRE', 'OA!'
WHERE NOT EXISTS (SELECT 1 FROM configuracion_sistema WHERE clave = 'EMAIL_RECUPERACION_NOMBRE');

INSERT INTO configuracion_sistema (clave, valor)
SELECT 'EMAIL_RECUPERACION_ASUNTO', 'OA! - Recuperación de contraseña'
WHERE NOT EXISTS (SELECT 1 FROM configuracion_sistema WHERE clave = 'EMAIL_RECUPERACION_ASUNTO');
