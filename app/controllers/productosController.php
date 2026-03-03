<?php
require_once __DIR__ . '/../models/productos.php';
require_once __DIR__ . '/../models/inventario.php';

class productosController {
    private $model;
    private $inventarioModel;

    public function __construct() {
        $this->model = new Productos();
        $this->inventarioModel = new Inventario();
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
            $stockInicial = $body['stock'] ?? 0;
            $body['stock'] = 0; // Forzamos stock 0 en la creación inicial del producto
            $body['activo'] = 1;
            
            // Iniciar transacción
            $db = Conexion::getConexion();
            $db->beginTransaction();

            $id = $this->model->create($body);

            // Si el stock inicial solicitado era mayor a 0, registramos el movimiento
            if ($stockInicial > 0) {
                $this->inventarioModel->registrarMovimiento([
                    'producto_id' => $id,
                    'tipo' => 'entrada',
                    'cantidad' => $stockInicial,
                    'motivo' => 'Carga inicial de producto',
                    'usuario_id' => $_SESSION['usuario_id'] ?? null
                ]);
            }

            $db->commit();
            response(['success' => true, 'id' => $id, 'message' => 'Producto creado con carga inicial'], 201);
        } catch (Exception $e) { 
            if (isset($db) && $db->inTransaction()) $db->rollBack();
            error($e->getMessage()); 
        }
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
