<?php
require_once __DIR__ . '/../core/base.php';

class Abonos extends BaseModel {
    protected $table = 'abonos';
    protected $fields = ['venta_id', 'caja_id', 'usuario_id', 'monto', 'metodo_pago'];

    public function getSumByCaja($cajaId, $metodo = null) {
        $sql = "SELECT COALESCE(SUM(monto), 0) as total FROM {$this->table} WHERE caja_id = ?";
        $params = [$cajaId];
        
        if ($metodo) {
            $sql .= " AND metodo_pago = ?";
            $params[] = $metodo;
        }
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return (float)$stmt->fetch()['total'];
    }

    public function getByCaja($cajaId) {
        $sql = "SELECT a.*, v.folio, u.nombre as usuario_nombre 
                FROM {$this->table} a
                JOIN ventas v ON a.venta_id = v.id
                JOIN usuarios u ON a.usuario_id = u.id
                WHERE a.caja_id = ?
                ORDER BY a.fecha ASC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$cajaId]);
        return $stmt->fetchAll();
    }
}
