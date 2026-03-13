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
                    'folio' => $body['folio'] ?? null,
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
        validate($body, ['venta_id', 'monto', 'metodo_pago']);
        try {
            $this->model->registrarAbono($body['venta_id'], $body['monto'], $body['metodo_pago']);
            // Obtener datos de la venta para el ticket
            $venta = $this->model->getById($body['venta_id']);
            response([
                'success' => true, 
                'message' => 'Abono registrado',
                'data' => [
                    'folio' => $venta['folio'],
                    'monto' => $body['monto'],
                    'metodo' => $body['metodo_pago'],
                    'saldo_restante' => $venta['saldo'],
                    'cliente' => $body['cliente_nombre'] ?? 'Cliente General'
                ]
            ]);
        } catch (Exception $e) { error($e->getMessage()); }
    }

    public function abonarMasivo() {
        $body = getBody();
        validate($body, ['cliente_id', 'monto', 'metodo_pago']);
        try {
            $detalles = $this->model->registrarAbonoMasivo($body['cliente_id'], $body['monto'], $body['metodo_pago']);
            response([
                'success' => true, 
                'message' => 'Abono masivo procesado correctamente',
                'data' => [
                    'monto' => $body['monto'],
                    'metodo' => $body['metodo_pago'],
                    'cliente' => $body['cliente_nombre'] ?? 'Cliente General',
                    'cuentas' => $detalles // Aquí van los folios y montos individuales
                ]
            ]);
        } catch (Exception $e) { error($e->getMessage()); }
    }

    public function getFullVentas() {
        $body = getBody();
        try {
            // Valores por defecto si no vienen
            if (!isset($body['fechaInicio'])) $body['fechaInicio'] = '2000-01-01';
            if (!isset($body['fechaFin'])) $body['fechaFin'] = date('Y-m-d');
            
            $body['conDetalles'] = isset($body['conDetalles']) ? (bool)$body['conDetalles'] : false;
            $data = $this->model->getReporte($body);
            response(['success' => true, 'data' => $data]);
        } catch (Exception $e) { error($e->getMessage()); }
    }

    public function cancelar() {
        if ($_SESSION['rol'] !== 'admin') error('No tienes permisos para realizar esta acción');
        
        $body = getBody();
        validate($body, ['id']);
        
        try {
            $venta = $this->model->getById($body['id']);
            if (!$venta) error('Venta no encontrada');

            // Validar tiempo (15 minutos)
            $fechaVenta = new DateTime($venta['fecha_venta']);
            $ahora = new DateTime();
            $diferencia = $ahora->getTimestamp() - $fechaVenta->getTimestamp();
            
            if ($diferencia > (15 * 60)) {
                error('El tiempo límite para cancelar esta venta (15 min) ha expirado');
            }

            $this->model->cancelarVenta($body['id']);
            response(['success' => true, 'message' => 'Venta cancelada correctamente']);
        } catch (Exception $e) { error($e->getMessage()); }
    }

    public function editar() {
        if ($_SESSION['rol'] !== 'admin') error('No tienes permisos para realizar esta acción');

        $body = getBody();
        validate($body, ['id', 'productos']);

        try {
            $venta = $this->model->getById($body['id']);
            if (!$venta) error('Venta no encontrada');

            // Validar tiempo (15 minutos)
            $fechaVenta = new DateTime($venta['fecha_venta']);
            $ahora = new DateTime();
            $diferencia = $ahora->getTimestamp() - $fechaVenta->getTimestamp();
            
            if ($diferencia > (15 * 60)) {
                error('El tiempo límite para editar esta venta (15 min) ha expirado');
            }

            $res = $this->model->actualizarVenta($body['id'], $body);
            response(['success' => true, 'message' => 'Venta actualizada correctamente', ...$res]);
        } catch (Exception $e) { error($e->getMessage()); }
    }
}
