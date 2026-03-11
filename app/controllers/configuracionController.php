<?php
require_once __DIR__ . '/../models/configuracion.php';

class configuracionController {
    private $model;

    public function __construct() {
        $this->model = new Configuracion();
    }

    public function get() {
        try {
            $data = $this->model->getConfig();
            response(['success' => true, 'data' => $data]);
        } catch (Exception $e) { error($e->getMessage()); }
    }

    public function save() {
        if ($_SESSION['rol'] !== 'admin') error('No tienes permisos');
        
        $body = getBody();
        validate($body, ['nombre_negocio']);
        
        try {
            $this->model->saveConfig($body);
            response(['success' => true, 'message' => 'Configuración guardada correctamente']);
        } catch (Exception $e) { error($e->getMessage()); }
    }
}
