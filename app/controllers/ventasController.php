<?php
require_once __DIR__ . '/../models/ventas.php';

class ventasController
{

    private $model;

    public function __construct()
    {
        $this->model = new Ventas();
    }

    public function index()
    {
        $body = getBody();

        try {
            if (isset($body['id'])) {
                $data = $this->model->getVentaConDetalle((int)$body['id']);
            } else {
                $data = $this->model->getAllConDetalles();
            }
            response($data);
        } catch (Exception $e) {
            error($e->getMessage());
        }
    }

    public function getFullVentas()
    {
        $body = getBody();

        $required = ['fechaInicio', 'fechaFin'];
        validate($body, $required);

        try {

            $data = $this->model->getFullVentas((object)$body);

            $totalGeneral = array_sum(array_column($data, 'total'));

            response([
                'success' => true,
                'data' => $data,
                'totalGeneral' => $totalGeneral
            ]);
        } catch (Exception $e) {
            error($e->getMessage(), 400);
        }
    }


    public function nuevo()
    {
        $body = getBody();

        $required = ['productos'];
        validate($body, $required);

        if (!is_array($body['productos']) || empty($body['productos'])) {
            error('No hay productos en la venta', 400);
        }

        try {

            $cliente_id = $body['cliente_id'] ?? '1';
            $descuento  = (float)($body['descuento'] ?? 0);
            $metodo_pago = $body['metodo_pago'] ?? 'efectivo';
            $monto_pagado = (float)($body['monto_pagado'] ?? 0);
            $vendedor_id = $_SESSION['usuario_id'];

            if ($monto_pagado <= 0) {
                error('El monto pagado debe ser mayor a cero', 400);
            }

            $result = $this->model->crearVentaCompleta(
                $cliente_id,
                $vendedor_id,
                $body['productos'],
                $descuento,
                $metodo_pago,
                $monto_pagado
            );

            $response = [
                'success' => true,
                'folio' => $result['folio'],
                'total' => number_format($result['total'], 2),
                'venta_id' => $result['venta_id'],
                'monto_pagado' => number_format($result['monto_pagado'], 2),
                'saldo' => number_format($result['saldo'], 2)
            ];

            // Si hay cambio, lo incluimos en la respuesta
            if ($result['cambio'] > 0) {
                $response['cambio'] = number_format($result['cambio'], 2);
            }

            response($response, 201);
        } catch (Exception $e) {
            error($e->getMessage(), 400);
        }
    }

    public function abonar()
    {
        $body = getBody();

        // Validar campos requeridos
        $required = ['venta_id', 'monto'];
        validate($body, $required);

        try {
            $venta_id = (int)$body['venta_id'];
            $monto_abono = (float)$body['monto'];

            if ($monto_abono <= 0) {
                error('El monto del abono debe ser mayor a cero', 400);
            }

            $result = $this->model->registrarAbono(
                $venta_id,
                $monto_abono
            );

            response([
                'success' => true,
                'data' => $result
            ], 200);
        } catch (Exception $e) {
            error($e->getMessage(), 400);
        }
    }


    public function cambiarEstado()
    {
        $body = getBody();

        if (!isset($body['id']) || !isset($body['estado'])) {
            error('ID y estado requeridos', 400);
        }

        try {
            $this->model->cambiarEstado($body['id'], $body['estado']);
            response(['ok' => true]);
        } catch (Exception $e) {
            error($e->getMessage());
        }
    }
}
