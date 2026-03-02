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
}
