<?php
require_once __DIR__ . '/../models/inventario.php';

class inventarioController
{

    private $model;

    public function __construct()
    {
        $this->model = new Inventario();
    }

    public function registrarMovimiento()
    {
        $body = getBody();

        $required = ['producto_id', 'tipo', 'cantidad'];
        validate($body, $required);

        if (!in_array($body['tipo'], ['entrada', 'salida'])) {
            error('Tipo inválido', 400);
        }

        if ((int)$body['cantidad'] <= 0) {
            error('Cantidad debe ser mayor a 0', 400);
        }

        try {

            $usuario_id = $_SESSION['usuario_id'];
            $motivo = !empty(trim($body['motivo']))
                ? trim($body['motivo'])
                : 'Ajuste manual';


            $movimiento_id = $this->model->registrarMovimiento(
                (int)$body['producto_id'],
                $body['tipo'],
                (int)$body['cantidad'],
                $motivo,
                $usuario_id
            );

            response([
                'success' => true,
                'movimiento_id' => $movimiento_id,
                'message' => 'Movimiento registrado correctamente'
            ], 201);
        } catch (Exception $e) {
            error($e->getMessage(), 400);
        }
    }

    public function reporteCompleto()
    {
        $body = getBody();
        // Por defecto, carga los últimos 30 días si no hay fechas
        $fechaInicio = $body['fechaInicio'] ?? date('Y-m-d', strtotime('-30 days'));
        $fechaFin = $body['fechaFin'] ?? date('Y-m-d');
        
        try {
            $data = $this->model->getReportePorFechas($fechaInicio, $fechaFin);
            response(['success' => true, 'data' => $data]);
        } catch (Exception $e) {
            error($e->getMessage());
        }
    }

    


    public function listar()
    {
        $body = getBody();

        try {
            if (isset($body['producto_id'])) {
                // Capturamos las fechas si vienen en la petición
                $fechaInicio = isset($body['fechaInicio']) ? $body['fechaInicio'] : null;
                $fechaFin = isset($body['fechaFin']) ? $body['fechaFin'] : null;
                
                // Pasamos los 3 parámetros al modelo
                $data = $this->model->getMovimientosPorProducto((int)$body['producto_id'], $fechaInicio, $fechaFin);
            } else {
                $data = $this->model->getTodos();
            }
            response($data);
        } catch (Exception $e) {
            error($e->getMessage());
        }
    }

    public function resumenStock()
    {
        try {
            $data = $this->model->getResumenStock();
            response($data);
        } catch (Exception $e) {
            error($e->getMessage());
        }
    }
}
