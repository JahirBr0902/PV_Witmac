<?php
require_once __DIR__ . '/../models/caja.php';

class cajaController {
    private $model;

    public function __construct() {
        $this->model = new Caja();
    }

    public function estado() {
        try {
            $caja = $this->model->getCajaAbierta();
            if ($caja) {
                $resumen = $this->model->getResumenActual($caja['id']);
                $caja['resumen'] = $resumen;
            }
            response(['success' => true, 'caja' => $caja]);
        } catch (Exception $e) { error($e->getMessage()); }
    }

    public function abrir() {
        $body = getBody();
        validate($body, ['monto_inicial']);
        try {
            $id = $this->model->abrir($body['monto_inicial'], $_SESSION['usuario_id']);
            response(['success' => true, 'message' => 'Caja abierta correctamente', 'id' => $id]);
        } catch (Exception $e) { error($e->getMessage()); }
    }

    public function cerrar() {
        $body = getBody();
        validate($body, ['monto_real']);
        try {
            $caja = $this->model->getCajaAbierta();
            if (!$caja) throw new Exception("No hay una caja abierta para cerrar.");
            
            $this->model->cerrar($caja['id'], $body['monto_real'], $_SESSION['usuario_id']);
            response(['success' => true, 'message' => 'Corte de caja realizado con éxito']);
        } catch (Exception $e) { error($e->getMessage()); }
    }

    public function historial() {
        $body = getBody();
        $inicio = $body['fechaInicio'] ?? date('Y-m-d', strtotime('-30 days'));
        $fin = $body['fechaFin'] ?? date('Y-m-d');
        try {
            $data = $this->model->getHistorial($inicio, $fin);
            response(['success' => true, 'data' => $data]);
        } catch (Exception $e) { error($e->getMessage()); }
    }

    public function detalle() {
        $body = getBody();
        validate($body, ['id']);
        try {
            $data = $this->model->getDetalleSesion($body['id']);
            response(['success' => true, 'data' => $data]);
        } catch (Exception $e) { error($e->getMessage()); }
    }
}
