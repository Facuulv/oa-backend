-- OA! backend — esquema de referencia alineado con BD `sistema_oa` (MySQL 8+)

CREATE DATABASE IF NOT EXISTS sistema_oa
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE sistema_oa;

CREATE TABLE IF NOT EXISTS usuarios (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    nombre              VARCHAR(100)    NOT NULL,
    apellido            VARCHAR(100)    NOT NULL,
    email               VARCHAR(150)    NOT NULL UNIQUE,
    telefono            VARCHAR(20)     NULL,
    password_hash       VARCHAR(255)    NOT NULL,
    rol                 ENUM('ADMIN','CLIENTE') NOT NULL DEFAULT 'CLIENTE',
    activo              TINYINT(1)      NOT NULL DEFAULT 1,
    fecha_creacion      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_modificacion  TIMESTAMP       NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS categorias (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    nombre              VARCHAR(100)    NOT NULL,
    descripcion         VARCHAR(255)    NULL,
    imagen_url          VARCHAR(500)    NULL,
    orden               INT             NOT NULL DEFAULT 0,
    activo              TINYINT(1)      NOT NULL DEFAULT 1,
    fecha_creacion      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_modificacion  TIMESTAMP       NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS productos (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    categoria_id        INT             NOT NULL,
    nombre              VARCHAR(150)    NOT NULL,
    descripcion         VARCHAR(500)    NULL,
    precio              DECIMAL(10,2)   NOT NULL,
    stock               INT             NOT NULL DEFAULT 0,
    imagen_url          VARCHAR(500)    NULL,
    destacado           TINYINT(1)      NOT NULL DEFAULT 0,
    disponible          TINYINT(1)      NOT NULL DEFAULT 1,
    activo              TINYINT(1)      NOT NULL DEFAULT 1,
    orden               INT             NOT NULL DEFAULT 0,
    fecha_creacion      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_modificacion  TIMESTAMP       NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (categoria_id) REFERENCES categorias(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS promociones (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    nombre              VARCHAR(150)    NOT NULL,
    descripcion         VARCHAR(500)    NULL,
    tipo                ENUM('PERCENTAGE','FIXED','BUY_X_GET_Y') NOT NULL,
    valor               DECIMAL(10,2)   NOT NULL DEFAULT 0,
    monto_minimo        DECIMAL(10,2)   NOT NULL DEFAULT 0,
    fecha_inicio        DATETIME        NULL,
    fecha_fin           DATETIME        NULL,
    activa              TINYINT(1)      NOT NULL DEFAULT 1,
    fecha_creacion      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_modificacion  TIMESTAMP       NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS cupones (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    codigo              VARCHAR(30)     NOT NULL UNIQUE,
    promocion_id        INT             NOT NULL,
    usos_maximos        INT             NOT NULL DEFAULT 1,
    usos_actuales       INT             NOT NULL DEFAULT 0,
    vence_en            DATETIME        NULL,
    activo              TINYINT(1)      NOT NULL DEFAULT 1,
    fecha_creacion      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_modificacion  TIMESTAMP       NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (promocion_id) REFERENCES promociones(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS pedidos (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id          INT             NULL,
    cliente_nombre      VARCHAR(100)    NOT NULL,
    cliente_email       VARCHAR(150)    NOT NULL,
    cliente_telefono    VARCHAR(20)     NULL,
    tipo_entrega        VARCHAR(50)     NOT NULL DEFAULT 'RETIRO',
    direccion_entrega   VARCHAR(500)    NULL,
    subtotal            DECIMAL(10,2)   NOT NULL DEFAULT 0,
    descuento           DECIMAL(10,2)   NOT NULL DEFAULT 0,
    total               DECIMAL(10,2)   NOT NULL DEFAULT 0,
    codigo_cupon        VARCHAR(30)     NULL,
    observaciones       VARCHAR(500)    NULL,
    estado              ENUM('PENDING','CONFIRMED','SHIPPED','DELIVERED','CANCELLED') NOT NULL DEFAULT 'PENDING',
    canal_origen        VARCHAR(50)     NOT NULL DEFAULT 'WEB',
    fecha_creacion      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_modificacion  TIMESTAMP       NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS pedidos_detalle (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    pedido_id           INT             NOT NULL,
    producto_id         INT             NOT NULL,
    nombre_producto     VARCHAR(200)    NOT NULL,
    cantidad            INT             NOT NULL DEFAULT 1,
    precio_unitario     DECIMAL(10,2)   NOT NULL,
    subtotal            DECIMAL(10,2)   NOT NULL,
    observaciones       VARCHAR(255)    NULL,
    fecha_creacion      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE,
    FOREIGN KEY (producto_id) REFERENCES productos(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS configuracion_sistema (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    clave               VARCHAR(100)    NOT NULL UNIQUE,
    valor               TEXT            NULL,
    fecha_modificacion  TIMESTAMP       NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

INSERT INTO usuarios (nombre, apellido, email, password_hash, rol) VALUES
    ('Admin', 'OA', 'admin@oa.com', '$2a$10$yKAhSuHBbC.OEo1QJ5us9OR2wVWM7o8j2/MqS2UuO8kx9h7S.jOTS', 'ADMIN')
ON DUPLICATE KEY UPDATE nombre = VALUES(nombre);
