<?php
require_once __DIR__ . '/../models/dashboard.php';

class dashboardController {
    private $model;

    public function __construct() {
        $this->model = new Dashboard();
    }

    public function resumen() {
        try {
            response($this->model->getResumen());
        } catch (Exception $e) { error($e->getMessage()); }
    }

    public function estadisticas() {
        try {
            $data = json_decode(file_get_contents('php://input'), true);
            $fechaInicio = $data['fechaInicio'] ?? date('Y-m-d', strtotime('-30 days'));
            $fechaFin = $data['fechaFin'] ?? date('Y-m-d');
            
            response($this->model->getAdvancedStats($fechaInicio, $fechaFin));
        } catch (Exception $e) { error($e->getMessage()); }
    }
}
