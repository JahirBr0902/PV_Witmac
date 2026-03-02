<?php
require_once __DIR__ . '/../models/usuarios.php';

class usuariosController
{
    private $model;

    public function __construct()
    {
        $this->model = new Usuarios();
    }

    public function index()
    {
        $body = getBody();
        try {
            if (isset($body['id'])) {
                $data = $this->model->getById((int)$body['id']);
            } else {
                $data = $this->model->getAll();
            }
            response($data);
        } catch (Exception $e) {
            error($e->getMessage());
        }
    }

    public function nuevo()
    {
        $body = getBody();
        validate($body, ['nombre', 'email', 'password']);

        try {
            $id = $this->model->crearUsuario($body);
            response([
                'success' => true,
                'message' => 'Usuario creado correctamente',
                'id' => $id
            ], 201);
        } catch (Exception $e) {
            error($e->getMessage());
        }
    }

    public function autenticar()
    {
        $body = getBody();
        validate($body, ['email', 'password']);

        try {
            $usuario = $this->model->autenticar($body['email'], $body['password']);

            if (!$usuario) {
                error('Credenciales inválidas o cuenta inactiva', 401);
            }

            // Iniciar sesión
            $_SESSION['usuario_id'] = $usuario['id'];
            $_SESSION['usuario_nombre'] = $usuario['nombre'];
            $_SESSION['usuario_email'] = $usuario['email'];
            $_SESSION['rol'] = $usuario['rol'];

            response([
                'success' => true,
                'message' => 'Bienvenido, ' . $usuario['nombre'],
                'usuario' => $usuario
            ]);
        } catch (Exception $e) {
            error($e->getMessage());
        }
    }

    public function update()
    {
        $body = getBody();
        if (!isset($body['id'])) error('ID requerido', 400);

        try {
            $id = $body['id'];
            unset($body['id']);
            
            $this->model->actualizarUsuario($id, $body);
            
            response([
                'success' => true,
                'message' => 'Usuario actualizado correctamente'
            ]);
        } catch (Exception $e) {
            error($e->getMessage());
        }
    }

    public function estatus()
    {
        $body = getBody();
        if (!isset($body['id'], $body['activo'])) error('Datos incompletos', 400);

        if ($body['id'] == $_SESSION['usuario_id']) {
            error('No puedes desactivar tu propia cuenta', 403);
        }

        try {
            $this->model->update($body['id'], ['activo' => $body['activo'] ? 1 : 0]);
            response([
                'success' => true,
                'message' => 'Estado actualizado'
            ]);
        } catch (Exception $e) {
            error($e->getMessage());
        }
    }

    public function listar() {
        try {
            $data = $this->model->getAll();
            response($data);
        } catch (Exception $e) {
            error($e->getMessage());
        }
    }
}
