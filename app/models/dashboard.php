<?php
require_once __DIR__ . '/../core/base.php';

class Dashboard extends BaseModel {
    
    public function getResumen() {
        $hoy = date('Y-m-d');
        
        // Estadísticas principales
        $stats = [
            'ventasHoy' => $this->db->query("SELECT COALESCE(SUM(total), 0) FROM ventas WHERE DATE(fecha_venta) = '$hoy' AND estado = 'completada'")->fetchColumn(),
            'totalProductos' => $this->db->query("SELECT COUNT(*) FROM productos WHERE activo = true")->fetchColumn(),
            'totalClientes' => $this->db->query("SELECT COUNT(*) FROM clientes WHERE activo = true")->fetchColumn(),
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
