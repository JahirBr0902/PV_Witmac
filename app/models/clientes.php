<?php
require_once __DIR__ . '/../core/base.php';

class Clientes extends BaseModel {
    protected $table = 'clientes';
    protected $fields = ['nombre', 'telefono', 'email', 'direccion', 'activo'];

    public function getClientesActivos() {
        return $this->where(['activo' => 1]);
    }

    public function buscarPorNombre($nombre) {
        $stmt = $this->db->prepare("SELECT * FROM {$this->table} WHERE nombre ILIKE ? ORDER BY nombre ASC");
        $stmt->execute(['%' . $nombre . '%']);
        return $stmt->fetchAll();
    }

    public function obtenerVentasCliente($cliente_id) {
        $sql = "SELECT v.*, u.nombre as vendedor_nombre 
                FROM ventas v 
                LEFT JOIN usuarios u ON v.vendedor_id = u.id 
                WHERE v.cliente_id = ? 
                ORDER BY v.fecha_venta DESC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$cliente_id]);
        return $stmt->fetchAll();
    }
}
