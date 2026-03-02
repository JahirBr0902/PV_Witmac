<?php
require_once __DIR__ . '/../core/base.php';

class Usuarios extends BaseModel
{
    protected $table = 'usuarios';
    protected $fields = ['nombre', 'email', 'password', 'rol', 'activo'];

    /**
     * Crea un usuario con hashing seguro de contraseña
     */
    public function crearUsuario($data)
    {
        // Validar si el email ya existe
        if ($this->where(['email' => $data['email']])) {
            throw new Exception('El correo electrónico ya está registrado.');
        }

        // Hash de la contraseña (BCRYPT por defecto)
        if (isset($data['password'])) {
            $data['password'] = password_hash($data['password'], PASSWORD_DEFAULT);
        }

        return $this->create($data);
    }

    /**
     * Autenticación segura usando password_verify
     */
    public function autenticar($email, $password)
    {
        $usuario = $this->findOne(['email' => $email, 'activo' => 1]);

        if ($usuario && password_verify($password, $usuario['password'])) {
            // No devolver la contraseña en el array de sesión/respuesta
            unset($usuario['password']);
            return $usuario;
        }

        
        return false;
    }

    /**
     * Actualizar usuario, manejando el cambio de contraseña opcional
     */
    public function actualizarUsuario($id, $data)
    {
        // Si viene contraseña, hashearla. Si no, quitarla del array para no borrarla
        if (!empty($data['password'])) {
            $data['password'] = password_hash($data['password'], PASSWORD_DEFAULT);
        } else {
            unset($data['password']);
        }

        return $this->update($id, $data);
    }

    public function obtenerVentas($usuario_id)
    {
        $sql = "SELECT v.*, c.nombre as cliente_nombre 
                FROM ventas v 
                LEFT JOIN clientes c ON v.cliente_id = c.id 
                WHERE v.vendedor_id = ? 
                ORDER BY v.fecha_venta DESC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$usuario_id]);
        return $stmt->fetchAll();
    }
}
