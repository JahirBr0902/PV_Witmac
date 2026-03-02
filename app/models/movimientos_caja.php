<?php
require_once __DIR__ . '/../core/base.php';

class MovimientosCaja extends BaseModel {
    protected $table = 'movimientos_caja';
    protected $fields = ['caja_id', 'usuario_id', 'tipo', 'monto', 'motivo'];

    public function getByCaja($cajaId) {
        $sql = "SELECT m.*, u.nombre as usuario_nombre 
                FROM {$this->table} m
                JOIN usuarios u ON m.usuario_id = u.id
                WHERE m.caja_id = ?
                ORDER BY m.fecha DESC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$cajaId]);
        return $stmt->fetchAll();
    }

    public function getSumasPorCaja($cajaId) {
        $sql = "SELECT 
                    COALESCE(SUM(CASE WHEN tipo = 'entrada' THEN monto ELSE 0 END), 0) as entradas,
                    COALESCE(SUM(CASE WHEN tipo = 'salida' THEN monto ELSE 0 END), 0) as salidas
                FROM {$this->table}
                WHERE caja_id = ?";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$cajaId]);
        return $stmt->fetch();
    }
}
