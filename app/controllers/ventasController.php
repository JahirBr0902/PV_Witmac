<?php
require_once __DIR__ . '/../models/ventas.php';

class ventasController {
    private $model;

    public function __construct() {
        $this->model = new Ventas();
    }

    public function index() {
        $body = getBody();
        try {
            if (isset($body['id'])) {
                $data = $this->model->getVentaConDetalle($body['id']);
            } else {
                // Filtros básicos por defecto (últimos 30 días)
                $filtros = [
                    'fechaInicio' => $body['fechaInicio'] ?? date('Y-m-d', strtotime('-30 days')),
                    'fechaFin' => $body['fechaFin'] ?? date('Y-m-d'),
                    'estado' => $body['estado'] ?? 'Todos',
                    'conDetalles' => $body['conDetalles'] ?? false
                ];
                $data = $this->model->getReporte($filtros);
            }
            response($data);
        } catch (Exception $e) { error($e->getMessage()); }
    }

    public function nuevo() {
        $body = getBody();
        validate($body, ['productos', 'metodo_pago']);
        try {
            $res = $this->model->crearVenta($body);
            response(['success' => true, 'message' => 'Venta completada', ...$res], 201);
        } catch (Exception $e) { error($e->getMessage()); }
    }

    public function abonar() {
        $body = getBody();
        validate($body, ['venta_id', 'monto']);
        try {
            $this->model->registrarAbono($body['venta_id'], $body['monto']);
            response(['success' => true, 'message' => 'Abono registrado']);
        } catch (Exception $e) { error($e->getMessage()); }
    }

    public function getFullVentas() {
        $body = getBody();
        validate($body, ['fechaInicio', 'fechaFin']);
        try {
            // Ahora respeta lo que mande el frontend (si no viene, por defecto false)
            $body['conDetalles'] = isset($body['conDetalles']) ? (bool)$body['conDetalles'] : false;
            $data = $this->model->getReporte($body);
            response(['success' => true, 'data' => $data]);
        } catch (Exception $e) { error($e->getMessage()); }
    }
}
