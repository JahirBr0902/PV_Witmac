<?php
require_once __DIR__ . '/../core/base.php';

class Caja extends BaseModel {
    protected $table = 'cajas';
    protected $fields = [
        'usuario_id_apertura', 'usuario_id_cierre', 'fecha_apertura', 'fecha_cierre', 
        'monto_inicial', 'monto_final_esperado', 'monto_final_real', 'diferencia', 
        'ventas_efectivo', 'ventas_transferencia', 'estado'
    ];

    /**
     * Obtiene la caja abierta actualmente
     */
    public function getCajaAbierta() {
        return $this->findOne(['estado' => 'abierta']);
    }

    /**
     * Abre una nueva caja
     */
    public function abrir($montoInicial, $usuarioId) {
        if ($this->getCajaAbierta()) {
            throw new Exception("Ya existe una caja abierta.");
        }

        return $this->create([
            'usuario_id_apertura' => $usuarioId,
            'monto_inicial' => $montoInicial,
            'monto_final_esperado' => $montoInicial,
            'estado' => 'abierta'
        ]);
    }

    /**
     * Obtiene el resumen actual de la caja abierta (ventas y abonos)
     */
    public function getResumenActual($cajaId) {
        // Sumar ventas en efectivo vinculadas a esta caja
        $sqlVentas = "SELECT 
                        COALESCE(SUM(CASE WHEN metodo_pago = 'efectivo' THEN monto_pagado ELSE 0 END), 0) as efectivo,
                        COALESCE(SUM(CASE WHEN metodo_pago = 'transferencia' THEN monto_pagado ELSE 0 END), 0) as transferencia
                      FROM ventas 
                      WHERE caja_id = ? AND estado != 'cancelada'";
        
        $stmt = $this->db->prepare($sqlVentas);
        $stmt->execute([$cajaId]);
        return $stmt->fetch();
    }

    /**
     * Cierra la caja actual
     */
    public function cerrar($cajaId, $montoReal, $usuarioId) {
        $caja = $this->getById($cajaId);
        if (!$caja || $caja['estado'] !== 'abierta') {
            throw new Exception("La caja no existe o ya está cerrada.");
        }

        $resumen = $this->getResumenActual($cajaId);
        $ventasEfectivo = (float)$resumen['efectivo'];
        $ventasTransferencia = (float)$resumen['transferencia'];
        
        $montoEsperado = (float)$caja['monto_inicial'] + $ventasEfectivo;
        $diferencia = $montoReal - $montoEsperado;

        return $this->update($cajaId, [
            'usuario_id_cierre' => $usuarioId,
            'fecha_cierre' => date('Y-m-d H:i:s'),
            'monto_final_esperado' => $montoEsperado,
            'monto_final_real' => $montoReal,
            'diferencia' => $diferencia,
            'ventas_efectivo' => $ventasEfectivo,
            'ventas_transferencia' => $ventasTransferencia,
            'estado' => 'cerrada'
        ]);
    }

    /**
     * Obtiene el historial de cajas cerradas
     */
    public function getHistorial($fechaInicio, $fechaFin) {
        $sql = "SELECT c.*, 
                       ua.nombre as usuario_apertura, 
                       uc.nombre as usuario_cierre
                FROM {$this->table} c
                LEFT JOIN usuarios ua ON c.usuario_id_apertura = ua.id
                LEFT JOIN usuarios uc ON c.usuario_id_cierre = uc.id
                WHERE DATE(c.fecha_apertura) BETWEEN ? AND ?
                ORDER BY c.fecha_apertura DESC";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$fechaInicio, $fechaFin]);
        return $stmt->fetchAll();
    }
}
