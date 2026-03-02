<?php
require_once __DIR__ . '/../models/productos.php';

class productosController {
    private $model;

    public function __construct() {
        $this->model = new Productos();
    }

    public function listar() {
        try {
            response($this->model->getAll());
        } catch (Exception $e) { error($e->getMessage()); }
    }

    public function nuevo() {
        $body = getBody();
        validate($body, ['codigo', 'nombre', 'precio_venta', 'stock']);
        try {
            $body['activo'] = 1;
            $id = $this->model->create($body);
            response(['success' => true, 'id' => $id, 'message' => 'Producto creado'], 201);
        } catch (Exception $e) { error($e->getMessage()); }
    }

    public function editar() {
        $body = getBody();
        if (!isset($body['id'])) error('ID requerido');
        try {
            $id = $body['id'];
            unset($body['id']);
            $this->model->update($id, $body);
            response(['success' => true, 'message' => 'Producto actualizado']);
        } catch (Exception $e) { error($e->getMessage()); }
    }

    public function estatus() {
        $body = getBody();
        if (!isset($body['id'], $body['activo'])) error('Datos incompletos');
        try {
            $this->model->update($body['id'], ['activo' => $body['activo'] ? 1 : 0]);
            response(['success' => true, 'message' => 'Estado actualizado']);
        } catch (Exception $e) { error($e->getMessage()); }
    }

    public function buscar() {
        $body = getBody();
        $q = $body['q'] ?? '';
        try {
            $data = $this->model->buscar($q);
            response(['success' => true, 'data' => $data]);
        } catch (Exception $e) { error($e->getMessage()); }
    }
}
