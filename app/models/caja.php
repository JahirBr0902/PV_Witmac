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
     * Obtiene el resumen actual de la caja abierta (ventas, abonos y movimientos)
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
        $ventas = $stmt->fetch();

        // Sumar abonos recibidos en esta caja
        require_once __DIR__ . '/abonos.php';
        $abonoModel = new Abonos();
        $abonosEfectivo = $abonoModel->getSumByCaja($cajaId, 'efectivo');
        $abonosTransfer = $abonoModel->getSumByCaja($cajaId, 'transferencia');

        // Sumar movimientos extras (entradas/salidas)
        require_once __DIR__ . '/movimientos_caja.php';
        $movModel = new MovimientosCaja();
        $movimientos = $movModel->getSumasPorCaja($cajaId);

        return [
            'efectivo' => (float)$ventas['efectivo'],
            'transferencia' => (float)$ventas['transferencia'],
            'abonos_efectivo' => $abonosEfectivo,
            'abonos_transfer' => $abonosTransfer,
            'entradas' => (float)$movimientos['entradas'],
            'salidas' => (float)$movimientos['salidas']
        ];
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
        $abonosEfe = (float)$resumen['abonos_efectivo'];
        $abonosTra = (float)$resumen['abonos_transfer'];
        $entradas = (float)$resumen['entradas'];
        $salidas = (float)$resumen['salidas'];
        
        // El monto esperado incluye: inicial + ventas efe + abonos efe + entradas efe - salidas efe
        $montoEsperado = (float)$caja['monto_inicial'] + $ventasEfectivo + $abonosEfe + $entradas - $salidas;
        $diferencia = $montoReal - $montoEsperado;

        return $this->update($cajaId, [
            'usuario_id_cierre' => $usuarioId,
            'fecha_cierre' => date('Y-m-d H:i:s'),
            'monto_final_esperado' => $montoEsperado,
            'monto_final_real' => $montoReal,
            'diferencia' => $diferencia,
            'ventas_efectivo' => $ventasEfectivo + $abonosEfe, 
            'ventas_transferencia' => $ventasTransferencia + $abonosTra,
            'estado' => 'cerrada'
        ]);
    }

    /**
     * Obtiene el detalle completo de una sesión de caja específica
     */
    public function getDetalleSesion($cajaId) {
        $caja = $this->getById($cajaId);
        if (!$caja) return null;

        // Obtener nombres de usuarios
        $sqlU = "SELECT 
                    (SELECT nombre FROM usuarios WHERE id = ?) as usuario_apertura,
                    (SELECT nombre FROM usuarios WHERE id = ?) as usuario_cierre";
        $stmtU = $this->db->prepare($sqlU);
        $stmtU->execute([$caja['usuario_id_apertura'], $caja['usuario_id_cierre']]);
        $usuarios = $stmtU->fetch();
        $caja['usuario_apertura_nombre'] = $usuarios['usuario_apertura'];
        $caja['usuario_cierre_nombre'] = $usuarios['usuario_cierre'];

        // Movimientos extras
        require_once __DIR__ . '/movimientos_caja.php';
        $movModel = new MovimientosCaja();
        $caja['movimientos'] = $movModel->getByCaja($cajaId);
        
        // Calcular totales de movimientos para el resumen
        $sumas = $movModel->getSumasPorCaja($cajaId);
        $caja['entradas_extras'] = $sumas['entradas'];
        $caja['salidas_extras'] = $sumas['salidas'];

        // Abonos de la sesión
        require_once __DIR__ . '/abonos.php';
        $abonoModel = new Abonos();
        $caja['abonos_detalle'] = $abonoModel->getByCaja($cajaId);

        // Ventas de la sesión
        $sqlV = "SELECT v.*, c.nombre as cliente_nombre, u.nombre as vendedor_nombre 
                 FROM ventas v 
                 LEFT JOIN clientes c ON v.cliente_id = c.id 
                 LEFT JOIN usuarios u ON v.vendedor_id = u.id
                 WHERE v.caja_id = ? AND v.estado != 'cancelada'
                 ORDER BY v.fecha_venta ASC";
        $stmtV = $this->db->prepare($sqlV);
        $stmtV->execute([$cajaId]);
        $caja['ventas'] = $stmtV->fetchAll();

        return $caja;
    }

    /**
     * Obtiene el historial de cajas cerradas con sus movimientos
     */
    public function getHistorial($fechaInicio, $fechaFin) {
        $sql = "SELECT c.*, 
                       ua.nombre as usuario_apertura, 
                       uc.nombre as usuario_cierre,
                       (SELECT COALESCE(SUM(monto), 0) FROM movimientos_caja WHERE caja_id = c.id AND tipo = 'entrada') as entradas_extras,
                       (SELECT COALESCE(SUM(monto), 0) FROM movimientos_caja WHERE caja_id = c.id AND tipo = 'salida') as salidas_extras
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
