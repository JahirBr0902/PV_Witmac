<?php
require_once __DIR__ . '/../core/base.php';

class Configuracion extends BaseModel {
    protected $table = 'configuracion';
    protected $fields = ['nombre_negocio', 'rfc', 'telefono', 'direccion', 'email', 'mensaje_ticket'];

    public function getConfig() {
        $stmt = $this->db->prepare("SELECT * FROM {$this->table} LIMIT 1");
        $stmt->execute();
        $res = $stmt->fetch();
        
        // Si no existe, devolvemos un objeto vacío con campos básicos
        if (!$res) {
            return [
                'nombre_negocio' => 'Mi Negocio',
                'rfc' => '',
                'telefono' => '',
                'direccion' => '',
                'email' => '',
                'mensaje_ticket' => '¡Gracias por su compra!'
            ];
        }
        return $res;
    }

    public function saveConfig($data) {
        $config = $this->getConfig();
        if (isset($config['id'])) {
            return $this->update($config['id'], $data);
        } else {
            return $this->create($data);
        }
    }
}
