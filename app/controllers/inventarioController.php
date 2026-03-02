<?php
require_once __DIR__ . '/../models/inventario.php';

class inventarioController {
    private $model;

    public function __construct() {
        $this->model = new Inventario();
    }

    public function registrar() {
        $body = getBody();
        validate($body, ['producto_id', 'tipo', 'cantidad']);
        try {
            $this->model->registrarMovimiento($body);
            response(['success' => true, 'message' => 'Movimiento registrado']);
        } catch (Exception $e) { error($e->getMessage()); }
    }

    public function reporte() {
        $body = getBody();
        $inicio = $body['fechaInicio'] ?? date('Y-m-d', strtotime('-30 days'));
        $fin = $body['fechaFin'] ?? date('Y-m-d');
        try {
            $data = $this->model->getReporte($inicio, $fin);
            response(['success' => true, 'data' => $data]);
        } catch (Exception $e) { error($e->getMessage()); }
    }

    public function historial() {
        $body = getBody();
        if (!isset($body['producto_id'])) error('Producto ID requerido');
        try {
            $data = $this->model->getHistorial($body['producto_id'], $body['fechaInicio'] ?? null, $body['fechaFin'] ?? null);
            response(['success' => true, 'data' => $data]);
        } catch (Exception $e) { error($e->getMessage()); }
    }
}
