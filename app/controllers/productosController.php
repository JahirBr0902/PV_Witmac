<?php
require_once __DIR__ . '/../models/productos.php';

class productosController
{

    private $model;

    public function __construct()
    {
        $this->model = new Productos();
    }

    public function index()
    {
        $body = getBody();

        try {
            $columns = ['id', 'codigo', 'nombre', 'descripcion', 'precio_compra', 'precio_venta', 'stock', 'stock_minimo', 'activo'];

            if (isset($body['id'])) {
                $data = $this->model->getById((int)$body['id'], $columns);
            } else {
                $data = $this->model->getAll($columns);
            }
            response($data);
        } catch (Exception $e) {
            error($e->getMessage());
        }
    }

    public function nuevo()
    {
        $body = getBody();

        $required = ['codigo', 'nombre', 'descripcion', 'precio_compra', 'precio_venta', 'stock', 'stock_minimo'];
        validate($body, $required);
        $body['fecha_creacion'] = date('Y-m-d H:i:s');
        $body['activo'] = true;
        try {
            $id = $this->model->create($body);

            response([
                'success' => true,
                'message' => 'Producto creado correctamente',
                'id' => $id
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
            $id = $this->model->update($id, $body);
            response([
                'success' => true,
                'message' => 'Producto actualizado correctamente',
                'id' => $id
            ], 201);
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
                ? 'Producto activado'
                : 'Producto desactivado'
        ]);
    }

    public function searchActivos()
    {
        $body = getBody();
        $q = $body['q'] ?? '';
        try {
            $data = $this->model->searchActivos($q);
            response([
                'success' => true,
                'data' => $data
            ]);
        } catch (Exception $e) {
            error($e->getMessage(), 400);
        }
    }


    public function destroy()
    {
        $body = getBody();
        eliminarHelper($this->model, $body);
    }
}
