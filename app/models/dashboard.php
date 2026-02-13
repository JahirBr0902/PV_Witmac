<?php
require_once __DIR__ . '/../core/base.php';

class Dashboard extends BaseModel
{

    protected $table = 'ventas';

    public function obtenerEstadisticas()
    {
        $stats = [];

        // Ventas de hoy
        $stmt = $this->db->prepare("
            SELECT COALESCE(SUM(total), 0) as total 
            FROM ventas 
            WHERE DATE(fecha_venta) = CURRENT_DATE AND estado = 'completada'
        ");
        $stmt->execute();
        $stats['ventasHoy'] = floatval($stmt->fetch()['total']);

        // Total productos
        $stmt = $this->db->prepare("
            SELECT COUNT(*) as total FROM productos WHERE activo = true
        ");
        $stmt->execute();
        $stats['totalProductos'] = intval($stmt->fetch()['total']);

        // Total clientes
        $stmt = $this->db->prepare("
            SELECT COUNT(*) as total
            FROM ventas 
            WHERE estado = 'pendiente'
        ");
        $stmt->execute();
        $stats['totalClientes'] = intval($stmt->fetch()['total']);

        // Stock bajo
        $stmt = $this->db->prepare("
            SELECT COUNT(*) as total FROM productos 
            WHERE stock <= stock_minimo AND activo = true
        ");
        $stmt->execute();
        $stats['stockBajo'] = intval($stmt->fetch()['total']);

        return $stats;
    }

    public function obtenerVentasSemana()
    {
        $ventasSemana = [
            'labels' => [],
            'valores' => []
        ];

        for ($i = 6; $i >= 0; $i--) {
            $fecha = date('Y-m-d', strtotime("-$i days"));
            $ventasSemana['labels'][] = date('d/m', strtotime($fecha));

            $stmt = $this->db->prepare("
                SELECT COALESCE(SUM(total), 0) as total 
                FROM ventas 
                WHERE DATE(fecha_venta) = :fecha AND estado = 'completada'
            ");
            $stmt->execute(['fecha' => $fecha]);
            $ventasSemana['valores'][] = floatval($stmt->fetch()['total']);
        }

        return $ventasSemana;
    }

    public function obtenerUltimasVentas($limite = 5)
    {
        $stmt = $this->db->prepare("
            SELECT v.id, v.folio, v.total, v.fecha_venta, 
                   COALESCE(c.nombre, 'Cliente General') as cliente
            FROM ventas v
            LEFT JOIN clientes c ON v.cliente_id = c.id
            ORDER BY v.fecha_venta DESC
            LIMIT :limite
        ");
        $stmt->execute(['limite' => (int)$limite]);

        $ultimasVentas = [];
        while ($row = $stmt->fetch()) {
            $ultimasVentas[] = [
                'id' => $row['id'],
                'folio' => $row['folio'],
                'total' => floatval($row['total']),
                'cliente' => $row['cliente'],
                'fecha' => date('d/m/Y H:i', strtotime($row['fecha_venta']))
            ];
        }

        return $ultimasVentas;
    }

    public function obtenerProductosMasVendidos($limite = 5)
    {
        $stmt = $this->db->prepare("
            SELECT p.id, p.nombre, SUM(dv.cantidad) as cantidad_vendida, 
                   SUM(dv.subtotal) as total_vendido
            FROM detalle_ventas dv
            INNER JOIN productos p ON dv.producto_id = p.id
            INNER JOIN ventas v ON dv.venta_id = v.id
            WHERE v.estado = 'completada'
            GROUP BY p.id, p.nombre
            ORDER BY cantidad_vendida DESC
            LIMIT :limite
        ");
        $stmt->execute(['limite' => (int)$limite]);
        return $stmt->fetchAll();
    }

    public function obtenerVentasPorVendedor()
    {
        $stmt = $this->db->prepare("
            SELECT u.id, u.nombre, COUNT(v.id) as cantidad_ventas, 
                   COALESCE(SUM(v.total), 0) as total_ventas
            FROM usuarios u
            LEFT JOIN ventas v ON u.id = v.vendedor_id AND v.estado = 'completada'
            WHERE u.rol = 'vendedor' AND u.activo = true
            GROUP BY u.id, u.nombre
            ORDER BY total_ventas DESC
        ");
        $stmt->execute();

        $vendedores = [];
        while ($row = $stmt->fetch()) {
            $vendedores[] = [
                'id' => $row['id'],
                'nombre' => $row['nombre'],
                'cantidadVentas' => intval($row['cantidad_ventas']),
                'totalVentas' => floatval($row['total_ventas'])
            ];
        }

        return $vendedores;
    }

    
    public function exportarVentas($data)
    {
        $stmt = $this->db->prepare("
        SELECT v.*, 
            COALESCE(c.nombre, 'Cliente General') AS cliente_nombre,
            u.nombre AS vendedor_nombre
        FROM ventas v
        LEFT JOIN clientes c ON v.cliente_id = c.id
        LEFT JOIN usuarios u ON v.vendedor_id = u.id
        WHERE DATE(v.fecha_venta) BETWEEN :fechaInicio AND :fechaFin
        ORDER BY v.fecha_venta DESC
    ");

        $stmt->execute([
            'fechaInicio' => $data->fechaInicio,
            'fechaFin' => $data->fechaFin
        ]);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }


    public function obtenerResumenCompleto()
    {
        return [
            'estadisticas' => $this->obtenerEstadisticas(),
            'ventasSemana' => $this->obtenerVentasSemana(),
            'ultimasVentas' => $this->obtenerUltimasVentas(),
            'productosMasVendidos' => $this->obtenerProductosMasVendidos(),
            'ventasPorVendedor' => $this->obtenerVentasPorVendedor()
        ];
    }
}
