<?php
require_once __DIR__ . '/../core/base.php';

class Productos extends BaseModel
{

    protected $table = 'productos';

    protected $fields = [
        'codigo',
        'nombre',
        'descripcion',
        'precio_compra',
        'precio_venta',
        'stock',
        'stock_minimo',
        'activo',
        'fecha_creacion'
    ];

    public function searchActivos($q)
    {
        $sql = "
        SELECT nombre, codigo, descripcion, precio_venta, stock
        FROM {$this->table}
        WHERE activo = true
          AND (codigo ILIKE :q OR nombre ILIKE :q)
        ORDER BY nombre
        LIMIT 10
    ";

        $stmt = $this->db->prepare($sql);

        $search = "%{$q}%";

        $stmt->bindParam(':q', $search, PDO::PARAM_STR);

        $stmt->execute();

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
}
