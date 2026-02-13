<?php
require_once __DIR__ . '/../core/base.php';

class Usuarios extends BaseModel
{

    protected $table = 'usuarios';

    protected $fields = [
        'nombre',
        'email',
        'password',
        'rol',
        'activo'
    ];

    public function crearUsuario($nombre, $email, $password, $rol = 'vendedor')
    {
        if (!in_array($rol, ['admin', 'vendedor'])) {
            throw new Exception('Rol inválido: admin o vendedor');
        }

        $stmt = $this->db->prepare("SELECT id FROM {$this->table} WHERE email = :email");
        $stmt->execute(['email' => $email]);

        if ($stmt->fetch()) {
            throw new Exception('Email ya existe');
        }

        $data = [
            'nombre' => $nombre,
            'email' => $email,
            'password' => md5($password),
            'rol' => $rol,
            'activo' => true
        ];

        return $this->create($data);
    }

    public function autenticar($email, $password)
    {
        $stmt = $this->db->prepare("
        SELECT * FROM {$this->table}
        WHERE email = :email AND password = :password AND activo = true
        LIMIT 1
    ");

        $stmt->execute([
            'email' => $email,
            'password' => md5($password)
        ]);

        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    public function obtenerVentas($usuario_id)
    {
        $stmt = $this->db->prepare("
            SELECT v.*, c.nombre as cliente_nombre
            FROM ventas v
            LEFT JOIN clientes c ON v.cliente_id = c.id
            WHERE v.vendedor_id = :usuario_id
            ORDER BY v.fecha_venta DESC
        ");
        $stmt->execute(['usuario_id' => $usuario_id]);
        return $stmt->fetchAll();
    }

    public function obtenerPorRol($rol)
    {
        if (!in_array($rol, ['admin', 'vendedor'])) {
            throw new Exception('Rol inválido');
        }

        $stmt = $this->db->prepare("
            SELECT id, nombre, email, rol, activo, fecha_creacion
            FROM {$this->table}
            WHERE rol = :rol
            ORDER BY nombre ASC
        ");
        $stmt->execute(['rol' => $rol]);
        return $stmt->fetchAll();
    }
}
