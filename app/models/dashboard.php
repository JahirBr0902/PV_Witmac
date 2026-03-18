<?php
require_once __DIR__ . '/../core/base.php';

class Dashboard extends BaseModel {
    
    public function getResumen() {
        $hoy = date('Y-m-d');
        
        // Estadísticas principales
        $stats = [
            'ventasEfectivoHoy' => $this->db->query("SELECT (
                COALESCE((SELECT SUM(monto_pagado) FROM ventas WHERE DATE(fecha_venta) = '$hoy' AND metodo_pago = 'efectivo' AND estado != 'cancelada'), 0) + 
                COALESCE((SELECT SUM(monto) FROM abonos WHERE DATE(fecha) = '$hoy' AND metodo_pago = 'efectivo'), 0)
            )")->fetchColumn(),
            'ventasTransferHoy' => $this->db->query("SELECT (
                COALESCE((SELECT SUM(monto_pagado) FROM ventas WHERE DATE(fecha_venta) = '$hoy' AND metodo_pago = 'transferencia' AND estado != 'cancelada'), 0) + 
                COALESCE((SELECT SUM(monto) FROM abonos WHERE DATE(fecha) = '$hoy' AND metodo_pago = 'transferencia'), 0)
            )")->fetchColumn(),
            'totalPendiente' => $this->db->query("SELECT COALESCE(SUM(saldo), 0) FROM ventas WHERE estado = 'pendiente'")->fetchColumn(),
            'stockBajo' => $this->db->query("SELECT COUNT(*) FROM productos WHERE stock <= stock_minimo AND activo = true")->fetchColumn()
        ];

        // Ventas de la última semana (para gráfica)
        $ventasSemana = $this->getVentasUltimaSemana();

        // Últimas 5 ventas
        $sqlUltimas = "SELECT v.folio, COALESCE(c.nombre, 'Cliente General') as cliente, v.total, 
                       TO_CHAR(v.fecha_venta, 'HH24:MI') as fecha 
                       FROM ventas v 
                       LEFT JOIN clientes c ON v.cliente_id = c.id 
                       ORDER BY v.fecha_venta DESC LIMIT 5";
        $ultimasVentas = $this->db->query($sqlUltimas)->fetchAll();

        return [
            'estadisticas' => $stats,
            'ventasSemana' => $ventasSemana,
            'ultimasVentas' => $ultimasVentas
        ];
    }

    public function getAdvancedStats($fechaInicio, $fechaFin) {
        // Clientes que más compran (por total de ventas)
        $sqlTopClientes = "SELECT c.nombre as cliente, SUM(v.total) as total_compras, COUNT(v.id) as num_ventas
                           FROM ventas v
                           JOIN clientes c ON v.cliente_id = c.id
                           WHERE DATE(v.fecha_venta) BETWEEN ? AND ? AND v.estado != 'cancelada'
                           GROUP BY c.id, c.nombre
                           ORDER BY total_compras DESC LIMIT 10";
        $stmt = $this->db->prepare($sqlTopClientes);
        $stmt->execute([$fechaInicio, $fechaFin]);
        $topClientes = $stmt->fetchAll();

        // Histórico de Créditos: Cuanto ha pedido fiado y cuanto ha pagado
        $sqlHistorialCredito = "SELECT 
                                    c.nombre as cliente, 
                                    SUM(v.total) as total_pedido, 
                                    SUM(v.monto_pagado) as total_pagado,
                                    SUM(v.saldo) as saldo_actual
                                FROM ventas v
                                JOIN clientes c ON v.cliente_id = c.id
                                WHERE v.estado != 'cancelada' AND (v.saldo > 0 OR EXISTS (SELECT 1 FROM abonos WHERE venta_id = v.id))
                                GROUP BY c.id, c.nombre
                                ORDER BY saldo_actual DESC LIMIT 10";
        $historialCredito = $this->db->query($sqlHistorialCredito)->fetchAll();

        // Productos con mayor margen de ganancia (Utilidad)
        $sqlGanancias = "SELECT 
                            p.nombre, 
                            SUM(vd.cantidad * (vd.precio_unitario - p.precio_compra)) as ganancia_total,
                            SUM(vd.cantidad) as unidades_vendidas
                         FROM detalle_ventas vd
                         JOIN productos p ON vd.producto_id = p.id
                         JOIN ventas v ON vd.venta_id = v.id
                         WHERE DATE(v.fecha_venta) BETWEEN ? AND ? AND v.estado != 'cancelada'
                         GROUP BY p.id, p.nombre
                         ORDER BY ganancia_total DESC LIMIT 10";
        $stmt = $this->db->prepare($sqlGanancias);
        $stmt->execute([$fechaInicio, $fechaFin]);
        $topGanancias = $stmt->fetchAll();

        // Productos más vendidos (Volumen)
        $sqlTopProductos = "SELECT p.nombre, SUM(vd.cantidad) as total_vendido, SUM(vd.subtotal) as total_recaudado
                            FROM detalle_ventas vd
                            JOIN productos p ON vd.producto_id = p.id
                            JOIN ventas v ON vd.venta_id = v.id
                            WHERE DATE(v.fecha_venta) BETWEEN ? AND ? AND v.estado != 'cancelada'
                            GROUP BY p.id, p.nombre
                            ORDER BY total_vendido DESC LIMIT 10";
        $stmt = $this->db->prepare($sqlTopProductos);
        $stmt->execute([$fechaInicio, $fechaFin]);
        $topProductos = $stmt->fetchAll();

        return [
            'topClientes' => $topClientes,
            'historialCredito' => $historialCredito,
            'topGanancias' => $topGanancias,
            'topProductos' => $topProductos
        ];
    }

    private function getVentasUltimaSemana() {
        $labels = [];
        $valores = [];
        
        for ($i = 6; $i >= 0; $i--) {
            $fecha = date('Y-m-d', strtotime("-$i days"));
            $labels[] = date('d/m', strtotime($fecha));
            
            $sql = "SELECT COALESCE(SUM(total), 0) FROM ventas WHERE DATE(fecha_venta) = ? AND estado = 'completada'";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$fecha]);
            $valores[] = (float)$stmt->fetchColumn();
        }

        return ['labels' => $labels, 'valores' => $valores];
    }
}
