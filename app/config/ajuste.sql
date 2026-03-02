-- Script de ajuste de zona horaria para TiendaWitmac
-- Ejecutar en psql o pgAdmin

-- 1. Ajustar la zona horaria de la base de datos para futuros registros
ALTER DATABASE "TiendaWitmac" SET timezone TO 'America/Mexico_City';

-- 2. Convertir columnas existentes a timestamptz con la zona horaria correcta

-- Usuarios
ALTER TABLE usuarios 
ALTER COLUMN fecha_creacion TYPE timestamptz 
USING fecha_creacion AT TIME ZONE 'America/Mexico_City';

-- Clientes
ALTER TABLE clientes 
ALTER COLUMN fecha_registro TYPE timestamptz 
USING fecha_registro AT TIME ZONE 'America/Mexico_City';

-- Productos
ALTER TABLE productos 
ALTER COLUMN fecha_creacion TYPE timestamptz 
USING fecha_creacion AT TIME ZONE 'America/Mexico_City';

-- Ventas
ALTER TABLE ventas 
ALTER COLUMN fecha_venta TYPE timestamptz 
USING fecha_venta AT TIME ZONE 'America/Mexico_City';

-- Cajas
ALTER TABLE cajas 
ALTER COLUMN fecha_apertura TYPE timestamptz 
USING fecha_apertura AT TIME ZONE 'America/Mexico_City',
ALTER COLUMN fecha_cierre TYPE timestamptz 
USING fecha_cierre AT TIME ZONE 'America/Mexico_City';

-- Movimientos de Caja (Entradas/Salidas dinero)
ALTER TABLE movimientos_caja 
ALTER COLUMN fecha TYPE timestamptz 
USING fecha AT TIME ZONE 'America/Mexico_City';

-- Abonos (Pagos a crédito)
ALTER TABLE abonos 
ALTER COLUMN fecha TYPE timestamptz 
USING fecha AT TIME ZONE 'America/Mexico_City';

-- Movimientos de Inventario
ALTER TABLE movimientos_inventario 
ALTER COLUMN fecha_movimiento TYPE timestamptz 
USING fecha_movimiento AT TIME ZONE 'America/Mexico_City';
