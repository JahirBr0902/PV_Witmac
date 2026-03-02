<?php
require_once __DIR__ . '/../core/base.php';

class Productos extends BaseModel {
    protected $table = 'productos';
    protected $fields = ['codigo', 'nombre', 'descripcion', 'precio_compra', 'precio_venta', 'stock', 'stock_minimo', 'activo'];

    public function buscar($q, $soloActivos = true) {
        $sql = "SELECT id, codigo, nombre, precio_venta, stock 
                FROM {$this->table} 
                WHERE (codigo ILIKE ? OR nombre ILIKE ?)";
        
        if ($soloActivos) $sql .= " AND activo = true";
        
        $sql .= " ORDER BY nombre ASC LIMIT 15";
        
        $stmt = $this->db->prepare($sql);
        $term = "%$q%";
        $stmt->execute([$term, $term]);
        return $stmt->fetchAll();
    }
}
