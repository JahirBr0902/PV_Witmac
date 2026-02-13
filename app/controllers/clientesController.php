<?php
require_once __DIR__ . '/../models/clientes.php';

class clientesController
{

    private $model;

    public function __construct()
    {
        $this->model = new Clientes();
    }

    public function index()
    {
        $body = getBody();

        try {
            if (isset($body['id'])) {
                $data = $this->model->getById((int)$body['id']);
            } elseif (isset($body['nombre'])) {
                $data = $this->model->buscarPorNombre($body['nombre']);
            } else {
                $data = $this->model->getAll();
            }
            response($data);
        } catch (Exception $e) {
            error($e->getMessage());
        }
    }

    public function activos()
    {
        try {
            $data = $this->model->getClientesActivos();
            response($data);
        } catch (Exception $e) {
            error($e->getMessage());
        }
    }

    public function nuevo()
    {
        $body = getBody();

        $required = ['nombre'];
        validate($body, $required);

        try {
            $data = [
                'nombre' => $body['nombre'],
                'telefono' => $body['telefono'] ?? null,
                'email' => $body['email'] ?? null,
                'direccion' => $body['direccion'] ?? null,
                'activo' => $body['activo'] ?? true
            ];

            $cliente_id = $this->model->create($data);
                response([
                'success' => true,
                'message' => 'Cliente creado correctamente',
                'id' => $cliente_id
            ], 201);
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
            $this->model->update($id, $body);
            response([
                'success' => true,
                'message' => 'Cliente actualizado correctamente',
                'id' => $id
            ]);
        } catch (Exception $e) {
            error($e->getMessage());
        }
    }
    public function cambiarEstado()
    {
        $body = getBody();

        if (!isset($body['id'], $body['activo'])) {
            error('Datos incompletos', 400);
        }

        $this->model->setActivo($body['id'], $body['activo']);

        response([
            'success' => true,
            'message' => $body['activo']
                ? 'Cliente activado'
                : 'Cliente desactivado'
        ]);
    }

    public function ventasCliente()
    {
        $body = getBody();

        if (!isset($body['id'])) {
            error('ID del cliente requerido', 400);
        }

        try {
            $data = $this->model->obtenersVentasCliente((int)$body['id']);
            response($data);
        } catch (Exception $e) {
            error($e->getMessage());
        }
    }
}
