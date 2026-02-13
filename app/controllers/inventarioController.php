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


    public function listar()
    {
        $body = getBody();

        try {
            if (isset($body['producto_id'])) {
                $data = $this->model->getMovimientosPorProducto((int)$body['producto_id']);
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
