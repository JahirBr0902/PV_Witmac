<?php
require_once __DIR__ . '/../models/dashboard.php';

class dashboardController
{

    private $model;

    public function __construct()
    {
        $this->model = new Dashboard();
    }

    public function index()
    {
        try {
            $data = $this->model->obtenerResumenCompleto();
            response($data);
        } catch (Exception $e) {
            error($e->getMessage());
        }
    }

    public function estadisticas()
    {
        try {
            $data = $this->model->obtenerEstadisticas();
            response($data);
        } catch (Exception $e) {
            error($e->getMessage());
        }
    }

    public function ventasSemana()
    {
        try {
            $data = $this->model->obtenerVentasSemana();
            response($data);
        } catch (Exception $e) {
            error($e->getMessage());
        }
    }

    public function ultimasVentas()
    {
        $body = getBody();
        $limite = $body['limite'] ?? 5;

        try {
            $data = $this->model->obtenerUltimasVentas($limite);
            response($data);
        } catch (Exception $e) {
            error($e->getMessage());
        }
    }

    public function productosMasVendidos()
    {
        $body = getBody();
        $limite = $body['limite'] ?? 5;

        try {
            $data = $this->model->obtenerProductosMasVendidos($limite);
            response($data);
        } catch (Exception $e) {
            error($e->getMessage());
        }
    }

    public function ventasPorVendedor()
    {
        try {
            $data = $this->model->obtenerVentasPorVendedor();
            response($data);
        } catch (Exception $e) {
            error($e->getMessage());
        }
    }


    public function exportarVentas()
    {
        $body = getBody();

        $required = ['fechaInicio', 'fechaFin'];
        validate($body, $required);
        
        try {

            $data = $this->model->exportarVentas((object)$body);

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

    
}
