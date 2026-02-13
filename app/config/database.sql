-- Base de datos para Sistema POS (crear desde psql o pgAdmin)
-- CREATE DATABASE pos_system;

-- Conectar a la base de datos
-- \c pos_system

-- Tabla de usuarios
CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    rol VARCHAR(20) CHECK (rol IN ('admin', 'vendedor')) DEFAULT 'vendedor',
    activo BOOLEAN DEFAULT TRUE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de clientes (ACTUALIZADA con campo activo)
CREATE TABLE clientes (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    telefono VARCHAR(20),
    email VARCHAR(100),
    direccion TEXT,
    activo BOOLEAN DEFAULT TRUE,  -- NUEVO CAMPO AÑADIDO
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de productos
CREATE TABLE productos (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(50) UNIQUE NOT NULL,
    nombre VARCHAR(200) NOT NULL,
    descripcion TEXT,
    precio_compra DECIMAL(10,2) NOT NULL,
    precio_venta DECIMAL(10,2) NOT NULL,
    stock INT DEFAULT 0,
    stock_minimo INT DEFAULT 5,
    activo BOOLEAN DEFAULT TRUE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de ventas
CREATE TABLE ventas (
    id SERIAL PRIMARY KEY,
    folio VARCHAR(50) UNIQUE NOT NULL,
    cliente_id INT,
    vendedor_id INT NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    descuento DECIMAL(10,2) DEFAULT 0,
    total DECIMAL(10,2) NOT NULL,
    metodo_pago VARCHAR(20) CHECK (metodo_pago IN ('efectivo', 'tarjeta', 'transferencia')) DEFAULT 'efectivo',
    estado VARCHAR(20) CHECK (estado IN ('completada', 'cancelada', 'pendiente')) DEFAULT 'completada',
    fecha_venta TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE SET NULL,
    FOREIGN KEY (vendedor_id) REFERENCES usuarios(id)
);

-- Tabla de detalle de ventas
CREATE TABLE detalle_ventas (
    id SERIAL PRIMARY KEY,
    venta_id INT NOT NULL,
    producto_id INT NOT NULL,
    cantidad INT NOT NULL,
    precio_unitario DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (venta_id) REFERENCES ventas(id) ON DELETE CASCADE,
    FOREIGN KEY (producto_id) REFERENCES productos(id)
);

-- Tabla de movimientos de inventario
CREATE TABLE movimientos_inventario (
    id SERIAL PRIMARY KEY,
    producto_id INT NOT NULL,
    tipo VARCHAR(20) CHECK (tipo IN ('entrada', 'salida')) NOT NULL,
    cantidad INT NOT NULL,
    motivo VARCHAR(200),
    usuario_id INT NOT NULL,
    fecha_movimiento TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (producto_id) REFERENCES productos(id),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

-- Insertar usuario admin por defecto (usando MD5 como en el original)
INSERT INTO usuarios (nombre, email, password, rol) 
VALUES ('Administrador', 'admin@pos.com', MD5('admin123'), 'admin');

-- Insertar algunos clientes de ejemplo (ACTUALIZADO con campo activo)
INSERT INTO clientes (nombre, telefono, email, activo) VALUES 
('Cliente General', '0000000000', 'general@cliente.com', true),
('Juan Pérez', '2221234567', 'juan@email.com', true),
('María García', '2227654321', 'maria@email.com', true),
('Carlos López', '2229876543', 'carlos@email.com', false),  -- Cliente inactivo
('Ana Martínez', '2225551234', 'ana@email.com', true);

-- Insertar productos de ejemplo
INSERT INTO productos (codigo, nombre, descripcion, precio_compra, precio_venta, stock) VALUES 
('PROD001', 'Refresco Coca Cola 600ml', 'Bebida gaseosa', 10.00, 15.00, 50),
('PROD002', 'Galletas Marías', 'Paquete de galletas', 8.00, 12.00, 30),
('PROD003', 'Agua Natural 1L', 'Agua purificada', 5.00, 8.00, 100),
('PROD004', 'Chocolate Abuelita', 'Tableta de chocolate', 15.00, 22.00, 25),
('PROD005', 'Pan Blanco', 'Paquete de pan de caja', 25.00, 35.00, 15);