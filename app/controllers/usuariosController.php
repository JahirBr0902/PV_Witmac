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
            } elseif (isset($body['rol'])) {
                $data = $this->model->obtenerPorRol($body['rol']);
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

        $required = ['nombre', 'email', 'password'];
        validate($body, $required);

        try {
            $rol = $body['rol'] ?? 'vendedor';
            $usuario_id = $this->model->crearUsuario(
                $body['nombre'],
                $body['email'],
                $body['password'],
                $rol
            );
            response([
                'success' => true,
                'message' => 'Usuario creado correctamente',
                'id' => $usuario_id
            ], 201);
        } catch (Exception $e) {
            error($e->getMessage());
        }
    }
    public function autenticar()
    {
        $body = getBody();

        $required = ['email', 'password'];
        validate($body, $required);

        try {

            $usuario = $this->model->autenticar($body['email'], $body['password']);

            if (!$usuario) {
                error('Credenciales inválidas', 401);
            }

            $_SESSION['usuario_id'] = $usuario['id'];
            $_SESSION['usuario_nombre'] = $usuario['nombre'];
            $_SESSION['usuario_email'] = $usuario['email'];
            $_SESSION['rol'] = $usuario['rol'];

            unset($usuario['password']);


            response([
                'success' => true,
                'message' => 'Login exitoso',
                'usuario' => $usuario
            ]);
        } catch (Exception $e) {
            error($e->getMessage());
        }
    }

    public function update()
    {
        $body = getBody();

        if (!isset($body['id'])) {
            error('ID requerido para actualizar', 400);
        }

        try {
            $id = $body['id'];
            unset($body['id']);
            unset($body['password']);
            $id = $this->model->update($id, $body);
            response([
                'success' => true,
                'message' => 'Usuario actualizado correctamente',
                'id' => $id
            ], 201);
        } catch (Exception $e) {
            error($e->getMessage());
        }
    }

    public function cambiarEstado()
    {
        $body = getBody();

        $id = $body['id'] ?? null;
        if ($id == $_SESSION['usuario_id']) {
            response(['success' => false, 'message' => 'No puedes desactivar tu propia cuenta']);
        }
        if (!isset($body['id'], $body['activo'])) {
            error('Datos incompletos', 400);
        }

        $this->model->setActivo($body['id'], $body['activo']);

        response([
            'success' => true,
            'message' => $body['activo']
                ? 'Usuario activado'
                : 'Usuario desactivado'
        ]);
    }

    public function ventasUsuario()
    {
        $body = getBody();

        if (!isset($body['id'])) {
            error('ID del usuario requerido', 400);
        }

        try {
            $data = $this->model->obtenerVentas((int)$body['id']);
            response($data);
        } catch (Exception $e) {
            error($e->getMessage());
        }
    }
}
