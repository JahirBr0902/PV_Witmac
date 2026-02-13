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
}
