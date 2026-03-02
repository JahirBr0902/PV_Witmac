<?php
require_once __DIR__ . '/../models/movimientos_caja.php';
require_once __DIR__ . '/../models/caja.php';

class movimientosCajaController {
    private $model;
    private $cajaModel;

    public function __construct() {
        $this->model = new MovimientosCaja();
        $this->cajaModel = new Caja();
    }

    public function registrar() {
        $body = getBody();
        validate($body, ['tipo', 'monto', 'motivo']);

        try {
            $caja = $this->cajaModel->getCajaAbierta();
            if (!$caja) {
                throw new Exception("No hay una caja abierta para registrar movimientos.");
            }

            $id = $this->model->create([
                'caja_id' => $caja['id'],
                'usuario_id' => $_SESSION['usuario_id'],
                'tipo' => $body['tipo'], // 'entrada' o 'salida'
                'monto' => $body['monto'],
                'motivo' => $body['motivo']
            ]);

            response(['success' => true, 'message' => 'Movimiento registrado correctamente', 'id' => $id]);
        } catch (Exception $e) { error($e->getMessage()); }
    }

    public function listar() {
        try {
            $caja = $this->cajaModel->getCajaAbierta();
            if (!$caja) {
                response(['success' => true, 'data' => []]);
            }

            $data = $this->model->getByCaja($caja['id']);
            response(['success' => true, 'data' => $data]);
        } catch (Exception $e) { error($e->getMessage()); }
    }
}
