<?php
require_once __DIR__ . '/../core/base.php';

class Inventario extends BaseModel {

    protected $table = 'movimientos_inventario';

    protected $fields = [
        'producto_id',
        'tipo',
        'cantidad',
        'motivo',
        'usuario_id'
    ];

public function registrarMovimiento($producto_id, $tipo, $cantidad, $motivo, $usuario_id)
{
    if (!in_array($tipo, ['entrada', 'salida'])) {
        throw new Exception('Tipo inválido: entrada o salida');
    }

    if ($cantidad <= 0) {
        throw new Exception('Cantidad debe ser mayor a 0');
    }

    // Bloqueamos producto
    $stmt = $this->db->prepare(
        "SELECT id, stock FROM productos WHERE id = :id FOR UPDATE"
    );
    $stmt->execute(['id' => $producto_id]);
    $producto = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$producto) {
        throw new Exception('Producto no encontrado');
    }

    if ($tipo === 'salida' && $producto['stock'] < $cantidad) {
        throw new Exception('Stock insuficiente');
    }

    $movimiento_id = $this->create([
        'producto_id' => $producto_id,
        'tipo' => $tipo,
        'cantidad' => $cantidad,
        'motivo' => $motivo,
        'usuario_id' => $usuario_id
    ]);

    $ajuste = $tipo === 'entrada' ? $cantidad : -$cantidad;

    $stmt = $this->db->prepare(
        "UPDATE productos SET stock = stock + :cantidad WHERE id = :id"
    );
    $stmt->execute([
        'cantidad' => $ajuste,
        'id' => $producto_id
    ]);

    return $movimiento_id;
}



    public function getMovimientosPorProducto($producto_id) {
        $stmt = $this->db->prepare("
            SELECT m.*, p.nombre as producto_nombre, u.nombre as usuario_nombre
            FROM {$this->table} m
            LEFT JOIN productos p ON m.producto_id = p.id
            LEFT JOIN usuarios u ON m.usuario_id = u.id
            WHERE m.producto_id = :producto_id
            ORDER BY m.fecha_movimiento DESC
        ");
        $stmt->execute(['producto_id' => $producto_id]);
        return $stmt->fetchAll();
    }

    public function getTodos() {
        $stmt = $this->db->prepare("
            SELECT m.*, p.nombre as producto_nombre, u.nombre as usuario_nombre
            FROM {$this->table} m
            LEFT JOIN productos p ON m.producto_id = p.id
            LEFT JOIN usuarios u ON m.usuario_id = u.id
            ORDER BY m.fecha_movimiento DESC
        ");
        $stmt->execute();
        return $stmt->fetchAll();
    }

    public function getResumenStock() {
        $stmt = $this->db->query("
            SELECT 
                id,
                nombre,
                stock,
                stock_minimo,
                CASE 
                    WHEN stock < stock_minimo THEN 'Bajo'
                    WHEN stock <= 0 THEN 'Agotado'
                    ELSE 'Normal'
                END as estado
            FROM productos
            ORDER BY stock ASC
        ");
        return $stmt->fetchAll();
    }

    public function getReporteCompleto() {
        $stmt = $this->db->query("
            SELECT 
                p.id,
                p.codigo,
                p.nombre,
                p.stock,
                p.stock_minimo,
                COALESCE(v.cantidad_vendida, 0) as cantidad_vendida,
                CASE 
                    WHEN p.stock <= 0 THEN 'Agotado'
                    WHEN p.stock <= p.stock_minimo THEN 'Bajo'
                    ELSE 'Normal'
                END as estado
            FROM productos p
            LEFT JOIN (
                SELECT dv.producto_id, SUM(dv.cantidad) as cantidad_vendida
                FROM detalle_ventas dv
                INNER JOIN ventas v ON dv.venta_id = v.id
                WHERE v.estado = 'completada'
                GROUP BY dv.producto_id
            ) v ON p.id = v.producto_id
            WHERE p.activo = true
            ORDER BY p.nombre ASC
        ");
        return $stmt->fetchAll();
    }
    public function getReportePorFechas($fechaInicio, $fechaFin) {
        $stmt = $this->db->prepare("
            SELECT 
                p.id, p.codigo, p.nombre, p.stock, p.stock_minimo, p.precio_compra, p.precio_venta,
                COALESCE(v.cantidad_vendida, 0) as cantidad_vendida,
                COALESCE(v.total_vendido, 0) as total_vendido,
                COALESCE(v.cantidad_vendida * p.precio_venta, 0) as ganancia,
                (p.stock * p.precio_venta) as valor_stock_costo,
                CASE 
                    WHEN p.stock <= 0 THEN 'Agotado'
                    WHEN p.stock <= p.stock_minimo THEN 'Bajo'
                    ELSE 'Normal'
                END as estado
            FROM productos p
            LEFT JOIN (
                SELECT dv.producto_id, 
                       SUM(dv.cantidad) as cantidad_vendida,
                       SUM(dv.subtotal) as total_vendido
                FROM detalle_ventas dv
                INNER JOIN ventas v ON dv.venta_id = v.id
                WHERE v.estado = 'completada' 
                  AND DATE(v.fecha_venta) BETWEEN :fechaInicio AND :fechaFin
                GROUP BY dv.producto_id
            ) v ON p.id = v.producto_id
            WHERE p.activo = true
            ORDER BY 
                CASE 
                    WHEN p.stock <= 0 THEN 1
                    WHEN p.stock <= p.stock_minimo THEN 2
                    ELSE 3
                END,
                p.nombre ASC
        ");
        
        $stmt->execute([
            'fechaInicio' => $fechaInicio, 
            'fechaFin' => $fechaFin
        ]);
        
        return $stmt->fetchAll();
    }
}
