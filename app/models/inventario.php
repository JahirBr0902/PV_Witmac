<?php
require_once __DIR__ . '/../core/base.php';
require_once __DIR__ . '/productos.php';

class Inventario extends BaseModel {
    protected $table = 'movimientos_inventario';
    protected $fields = ['producto_id', 'tipo', 'cantidad', 'motivo', 'usuario_id', 'fecha_movimiento'];

    /**
     * Registra un movimiento de inventario (Entrada/Salida)
     */
    public function registrarMovimiento($productoId, $tipo = null, $cantidad = null, $motivo = '', $usuarioId = null) {
        // Manejar si se pasa un array como primer parámetro
        if (is_array($productoId)) {
            $data = $productoId;
            $productoId = $data['producto_id'];
            $tipo = $data['tipo'];
            $cantidad = $data['cantidad'];
            $motivo = $data['motivo'] ?? '';
            $usuarioId = $data['usuario_id'] ?? $_SESSION['usuario_id'];
        }

        // CONTROL DE TRANSACCIÓN ANIDADA
        $gestionamosTransaccion = false;
        if (!$this->db->inTransaction()) {
            $this->db->beginTransaction();
            $gestionamosTransaccion = true;
        }

        try {
            $usuarioId = $usuarioId ?? $_SESSION['usuario_id'];
            $fecha = date('Y-m-d H:i:s');
            
            // 1. Insertar movimiento
            $stmt = $this->db->prepare("
                INSERT INTO {$this->table} (producto_id, tipo, cantidad, motivo, usuario_id, fecha_movimiento)
                VALUES (?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([$productoId, $tipo, $cantidad, $motivo, $usuarioId, $fecha]);

            // 2. Actualizar stock en productos
            $prodModel = new Productos();
            $producto = $prodModel->getById($productoId);
            if (!$producto) throw new Exception("Producto ID $productoId no encontrado");

            $nuevoStock = ($tipo === 'entrada') 
                ? $producto['stock'] + $cantidad 
                : $producto['stock'] - $cantidad;

            if ($nuevoStock < 0) throw new Exception("No hay suficiente stock para el producto: " . $producto['nombre']);

            $prodModel->update($productoId, ['stock' => $nuevoStock]);

            // Solo hacemos commit si nosotros iniciamos la transacción
            if ($gestionamosTransaccion) {
                $this->db->commit();
            }
            return true;
        } catch (Exception $e) {
            // Solo hacemos rollback si nosotros iniciamos la transacción y sigue activa
            if ($gestionamosTransaccion && $this->db->inTransaction()) {
                $this->db->rollBack();
            }
            throw $e; // Re-lanzamos el error para que el padre (Ventas) también se entere
        }
    }

    public function getReporte($fechaInicio, $fechaFin) {
        $sql = "SELECT p.id, p.codigo, p.nombre, p.stock, p.stock_minimo,
                (p.stock * p.precio_compra) as valor_stock_costo,
                COALESCE(SUM(vd.cantidad), 0) as cantidad_vendida,
                COALESCE(SUM(vd.subtotal - (vd.cantidad * p.precio_compra)), 0) as ganancia,
                CASE 
                    WHEN p.stock <= 0 THEN 'Agotado'
                    WHEN p.stock <= p.stock_minimo THEN 'Bajo'
                    ELSE 'Normal'
                END as estado
                FROM productos p
                LEFT JOIN detalle_ventas vd ON p.id = vd.producto_id
                LEFT JOIN ventas v ON vd.venta_id = v.id AND v.fecha_venta BETWEEN ? AND ?
                GROUP BY p.id
                ORDER BY estado DESC, p.nombre ASC";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$fechaInicio . ' 00:00:00', $fechaFin . ' 23:59:59']);
        return $stmt->fetchAll();
    }

    public function getHistorial($productoId, $fechaInicio = null, $fechaFin = null) {
        $sql = "SELECT m.*, u.nombre as usuario_nombre 
                FROM {$this->table} m 
                JOIN usuarios u ON m.usuario_id = u.id 
                WHERE m.producto_id = ?";
        $params = [$productoId];

        if ($fechaInicio && $fechaFin) {
            $sql .= " AND m.fecha_movimiento BETWEEN ? AND ?";
            $params[] = $fechaInicio . ' 00:00:00';
            $params[] = $fechaFin . ' 23:59:59';
        }

        $sql .= " ORDER BY m.fecha_movimiento DESC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }
}
