<?php
require_once __DIR__ . '/../core/base.php';

class Clientes extends BaseModel {

    protected $table = 'clientes';

    protected $fields = [
        'nombre',
        'telefono',
        'email',
        'direccion',
        'activo'
    ];

    public function getClientesActivos() {
        $stmt = $this->db->prepare("
            SELECT * FROM {$this->table}
            WHERE activo = true
            ORDER BY nombre ASC
        ");
        $stmt->execute();
        return $stmt->fetchAll();
    }

    public function buscarPorNombre($nombre) {
        $stmt = $this->db->prepare("
            SELECT * FROM {$this->table}
            WHERE nombre ILIKE :nombre
            ORDER BY nombre ASC
        ");
        $stmt->execute(['nombre' => '%' . $nombre . '%']);
        return $stmt->fetchAll();
    }

    public function buscarPorEmail($email) {
        $stmt = $this->db->prepare("
            SELECT * FROM {$this->table}
            WHERE email = :email
        ");
        $stmt->execute(['email' => $email]);
        return $stmt->fetch();
    }

    public function obtenersVentasCliente($cliente_id) {
        $stmt = $this->db->prepare("
            SELECT v.*, u.nombre as vendedor_nombre
            FROM ventas v
            LEFT JOIN usuarios u ON v.vendedor_id = u.id
            WHERE v.cliente_id = :cliente_id
            ORDER BY v.fecha_venta DESC
        ");
        $stmt->execute(['cliente_id' => $cliente_id]);
        return $stmt->fetchAll();
    }
}
