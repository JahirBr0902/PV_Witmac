<?php
require_once __DIR__ . '/../core/base.php';
require_once __DIR__ . '/inventario.php';

class Ventas extends BaseModel {
    protected $table = 'ventas';
    protected $fields = ['folio', 'cliente_id', 'vendedor_id', 'subtotal', 'descuento', 'total', 'monto_pagado', 'saldo', 'metodo_pago', 'estado', 'caja_id'];

    /**
     * Obtiene una venta con sus detalles, cliente y vendedor
     */
    public function getVentaConDetalle($id) {
        $sql = "SELECT v.*, c.nombre as cliente_nombre, u.nombre as vendedor_nombre 
                FROM {$this->table} v 
                LEFT JOIN clientes c ON v.cliente_id = c.id 
                LEFT JOIN usuarios u ON v.vendedor_id = u.id 
                WHERE v.id = ?";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$id]);
        $venta = $stmt->fetch();

        if ($venta) {
            $sqlDetalle = "SELECT dv.*, p.nombre as producto_nombre 
                           FROM detalle_ventas dv 
                           LEFT JOIN productos p ON dv.producto_id = p.id 
                           WHERE dv.venta_id = ?";
            $stmtD = $this->db->prepare($sqlDetalle);
            $stmtD->execute([$id]);
            $venta['detalles'] = $stmtD->fetchAll();
        }
        return $venta;
    }

    /**
     * Consulta flexible para reportes
     */
    public function getReporte($filtros) {
        $sql = "SELECT v.*, c.nombre as cliente_nombre, u.nombre as vendedor_nombre 
                FROM {$this->table} v 
                LEFT JOIN clientes c ON v.cliente_id = c.id 
                LEFT JOIN usuarios u ON v.vendedor_id = u.id 
                WHERE 1=1";
        
        $params = [];

        if (!empty($filtros['folio'])) {
            $sql .= " AND v.folio LIKE ?";
            $params[] = "%" . $filtros['folio'] . "%";
        } else {
            $sql .= " AND DATE(v.fecha_venta) BETWEEN ? AND ?";
            $params[] = $filtros['fechaInicio'];
            $params[] = $filtros['fechaFin'];
        }

        if (!empty($filtros['estado']) && $filtros['estado'] !== 'Todos') {
            $sql .= " AND v.estado = ?";
            $params[] = $filtros['estado'];
        }

        if (!empty($filtros['cliente_id'])) {
            $sql .= " AND v.cliente_id = ?";
            $params[] = $filtros['cliente_id'];
        }

        $sql .= " ORDER BY v.fecha_venta DESC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $ventas = $stmt->fetchAll();

        // Si se pide con detalles (para exportar)
        if (!empty($filtros['conDetalles'])) {
            foreach ($ventas as &$v) {
                $sqlD = "SELECT dv.*, p.nombre as producto_nombre FROM detalle_ventas dv LEFT JOIN productos p ON dv.producto_id = p.id WHERE dv.venta_id = ?";
                $stmtD = $this->db->prepare($sqlD);
                $stmtD->execute([$v['id']]);
                $v['detalles'] = $stmtD->fetchAll();
            }
        }

        return $ventas;
    }

    /**
     * Transacción completa de venta
     */
    public function crearVenta($data) {
        // Verificar si hay caja abierta
        require_once __DIR__ . '/caja.php';
        $cajaModel = new Caja();
        $caja = $cajaModel->getCajaAbierta();
        if (!$caja) {
            throw new Exception("No hay una caja abierta. Debe abrir caja antes de realizar ventas.");
        }

        $this->db->beginTransaction();
        try {
            $subtotal = 0;
            $items = [];

            foreach ($data['productos'] as $p) {
                // Bloqueamos el producto para evitar ventas simultáneas sin stock
                $stmt = $this->db->prepare("SELECT id, precio_venta, stock FROM productos WHERE id = ? FOR UPDATE");
                $stmt->execute([$p['id']]);
                $prod = $stmt->fetch();

                if (!$prod || $prod['stock'] < $p['cantidad']) {
                    throw new Exception("Stock insuficiente para el producto ID: " . $p['id']);
                }

                $subtotalItem = $prod['precio_venta'] * $p['cantidad'];
                $subtotal += $subtotalItem;
                $items[] = [
                    'id' => $prod['id'],
                    'cantidad' => $p['cantidad'],
                    'precio' => $prod['precio_venta'],
                    'subtotal' => $subtotalItem
                ];
            }

            $total = $subtotal - ($data['descuento'] ?? 0);
            $monto_pagado = $data['monto_pagado'] ?? 0;
            $saldo = max(0, $total - $monto_pagado);
            $folio = 'V-' . date('Ymd') . '-' . str_pad(random_int(1, 9999), 4, '0', STR_PAD_LEFT);

            $venta_id = $this->create([
                'folio' => $folio,
                'cliente_id' => $data['cliente_id'] ?? 1,
                'vendedor_id' => $_SESSION['usuario_id'],
                'subtotal' => $subtotal,
                'descuento' => $data['descuento'] ?? 0,
                'total' => $total,
                'monto_pagado' => $monto_pagado,
                'saldo' => $saldo,
                'metodo_pago' => $data['metodo_pago'] ?? 'efectivo',
                'estado' => $saldo > 0 ? 'pendiente' : 'completada',
                'caja_id' => $caja['id']
            ]);

            $inv = new Inventario();
            foreach ($items as $item) {
                $stmt = $this->db->prepare("INSERT INTO detalle_ventas (venta_id, producto_id, cantidad, precio_unitario, subtotal) VALUES (?,?,?,?,?)");
                $stmt->execute([$venta_id, $item['id'], $item['cantidad'], $item['precio'], $item['subtotal']]);
                
                // Registrar movimiento de inventario
                $inv->registrarMovimiento($item['id'], 'salida', $item['cantidad'], "Venta $folio");
            }

            $this->db->commit();
            return ['id' => $venta_id, 'folio' => $folio, 'total' => $total, 'saldo' => $saldo];
        } catch (Exception $e) {
            $this->db->rollBack();
            throw $e;
        }
    }

    /**
     * Devuelve el stock de los productos de una venta al inventario
     * Útil para cancelaciones o antes de una edición
     */
    private function restaurarStockVenta($venta_id, $motivo) {
        $venta = $this->getVentaConDetalle($venta_id);
        if (!$venta) return;

        $inv = new Inventario();
        foreach ($venta['detalles'] as $item) {
            $inv->registrarMovimiento(
                $item['producto_id'], 
                'entrada', 
                $item['cantidad'], 
                "$motivo (Folio: {$venta['folio']})"
            );
        }
    }

    /**
     * Cancela una venta, devuelve stock y marca como cancelada
     */
    public function cancelarVenta($id) {
        $this->db->beginTransaction();
        try {
            $venta = $this->getById($id);
            if (!$venta) throw new Exception("Venta no encontrada");
            if ($venta['estado'] === 'cancelada') throw new Exception("La venta ya está cancelada");

            // 1. Devolver stock
            $this->restaurarStockVenta($id, "Cancelación de venta");

            // 2. Cambiar estado
            $this->update($id, ['estado' => 'cancelada']);

            $this->db->commit();
            return true;
        } catch (Exception $e) {
            $this->db->rollBack();
            throw $e;
        }
    }

    /**
     * Actualiza una venta existente (Edición)
     * Proceso: Devuelve stock anterior -> Borra detalle -> Inserta nuevo detalle -> Resta nuevo stock -> Actualiza totales
     */
    public function actualizarVenta($id, $data) {
        $this->db->beginTransaction();
        try {
            $ventaOriginal = $this->getById($id);
            if (!$ventaOriginal) throw new Exception("Venta no encontrada");
            
            // 1. Devolver stock original
            $this->restaurarStockVenta($id, "Edición de venta (Reversión)");

            // 2. Limpiar detalle anterior (La BD tiene ON DELETE CASCADE, pero lo hacemos explícito si es necesario)
            $stmt = $this->db->prepare("DELETE FROM detalle_ventas WHERE venta_id = ?");
            $stmt->execute([$id]);

            // 3. Procesar nuevos productos (Misma lógica que crearVenta)
            $subtotal = 0;
            $items = [];
            foreach ($data['productos'] as $p) {
                $stmt = $this->db->prepare("SELECT id, precio_venta, stock FROM productos WHERE id = ? FOR UPDATE");
                $stmt->execute([$p['id']]);
                $prod = $stmt->fetch();

                if (!$prod || $prod['stock'] < $p['cantidad']) {
                    throw new Exception("Stock insuficiente para el producto ID: " . $p['id']);
                }

                $subtotalItem = $prod['precio_venta'] * $p['cantidad'];
                $subtotal += $subtotalItem;
                $items[] = [
                    'id' => $prod['id'],
                    'cantidad' => $p['cantidad'],
                    'precio' => $prod['precio_venta'],
                    'subtotal' => $subtotalItem
                ];
            }

            $total = $subtotal - ($data['descuento'] ?? 0);
            $monto_pagado = $data['monto_pagado'] ?? $ventaOriginal['monto_pagado'];
            $saldo = max(0, $total - $monto_pagado);

            // 4. Actualizar cabecera
            $this->update($id, [
                'cliente_id' => $data['cliente_id'] ?? $ventaOriginal['cliente_id'],
                'subtotal' => $subtotal,
                'descuento' => $data['descuento'] ?? 0,
                'total' => $total,
                'monto_pagado' => $monto_pagado,
                'saldo' => $saldo,
                'metodo_pago' => $data['metodo_pago'] ?? $ventaOriginal['metodo_pago'],
                'estado' => $saldo > 0 ? 'pendiente' : 'completada'
            ]);

            // 5. Insertar nuevo detalle y restar stock
            $inv = new Inventario();
            foreach ($items as $item) {
                $stmt = $this->db->prepare("INSERT INTO detalle_ventas (venta_id, producto_id, cantidad, precio_unitario, subtotal) VALUES (?,?,?,?,?)");
                $stmt->execute([$id, $item['id'], $item['cantidad'], $item['precio'], $item['subtotal']]);
                
                $inv->registrarMovimiento($item['id'], 'salida', $item['cantidad'], "Edición de venta {$ventaOriginal['folio']}");
            }

            $this->db->commit();
            return ['id' => $id, 'folio' => $ventaOriginal['folio'], 'total' => $total];
        } catch (Exception $e) {
            $this->db->rollBack();
            throw $e;
        }
    }

    /**
     * Registra un abono a una venta específica
     */
    public function registrarAbono($ventaId, $monto, $metodoPago) {
        require_once __DIR__ . '/caja.php';
        $cajaModel = new Caja();
        $caja = $cajaModel->getCajaAbierta();
        if (!$caja) {
            throw new Exception("No hay una caja abierta. Debe abrir caja antes de registrar abonos.");
        }

        $this->db->beginTransaction();
        try {
            $venta = $this->getById($ventaId);
            if (!$venta) throw new Exception("Venta no encontrada");
            if ($venta['estado'] === 'cancelada') throw new Exception("No se puede abonar a una venta cancelada");
            
            $monto = (float)$monto;
            if ($monto > (float)$venta['saldo']) {
                throw new Exception("El monto a abonar supera el saldo pendiente (" . $venta['saldo'] . ")");
            }

            $nuevoPagado = (float)$venta['monto_pagado'] + $monto;
            $nuevoSaldo = (float)$venta['saldo'] - $monto;
            $nuevoEstado = $nuevoSaldo <= 0 ? 'completada' : 'pendiente';

            // 1. Actualizar venta
            $this->update($ventaId, [
                'monto_pagado' => $nuevoPagado,
                'saldo' => $nuevoSaldo,
                'estado' => $nuevoEstado
            ]);

            // 2. Registrar en tabla abonos
            $stmt = $this->db->prepare("INSERT INTO abonos (venta_id, caja_id, usuario_id, monto, metodo_pago) VALUES (?,?,?,?,?)");
            $stmt->execute([$ventaId, $caja['id'], $_SESSION['usuario_id'], $monto, $metodoPago]);

            $this->db->commit();
            return true;
        } catch (Exception $e) {
            $this->db->rollBack();
            throw $e;
        }
    }

    /**
     * Registra un abono masivo distribuyendo el monto entre las deudas más antiguas de un cliente
     */
    public function registrarAbonoMasivo($clienteId, $montoTotal, $metodoPago) {
        require_once __DIR__ . '/caja.php';
        $cajaModel = new Caja();
        $caja = $cajaModel->getCajaAbierta();
        if (!$caja) {
            throw new Exception("No hay una caja abierta. Debe abrir caja antes de registrar abonos.");
        }

        // Obtener todas las ventas pendientes del cliente, ordenadas por fecha (FIFO)
        $sql = "SELECT id, folio, saldo, monto_pagado FROM {$this->table} 
                WHERE cliente_id = ? AND estado = 'pendiente' AND saldo > 0 
                ORDER BY fecha_venta ASC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$clienteId]);
        $pendientes = $stmt->fetchAll();

        if (empty($pendientes)) {
            throw new Exception("El cliente no tiene deudas pendientes.");
        }

        $montoRestante = (float)$montoTotal;
        $detallesAbono = [];
        $this->db->beginTransaction();

        try {
            foreach ($pendientes as $v) {
                if ($montoRestante <= 0) break;

                $saldoVenta = (float)$v['saldo'];
                $abonoAVenta = min($montoRestante, $saldoVenta);

                $nPagado = (float)$v['monto_pagado'] + $abonoAVenta;
                $nSaldo = $saldoVenta - $abonoAVenta;
                $nEstado = $nSaldo <= 0 ? 'completada' : 'pendiente';

                $this->update($v['id'], [
                    'monto_pagado' => $nPagado,
                    'saldo' => $nSaldo,
                    'estado' => $nEstado
                ]);

                // Registrar el abono individual para el historial
                $stmtA = $this->db->prepare("INSERT INTO abonos (venta_id, caja_id, usuario_id, monto, metodo_pago) VALUES (?,?,?,?,?)");
                $stmtA->execute([$v['id'], $caja['id'], $_SESSION['usuario_id'], $abonoAVenta, $metodoPago]);

                $detallesAbono[] = [
                    'folio' => $v['folio'],
                    'abono' => $abonoAVenta,
                    'saldo_final' => $nSaldo
                ];

                $montoRestante -= $abonoAVenta;
            }

            $this->db->commit();
            return $detallesAbono;
        } catch (Exception $e) {
            $this->db->rollBack();
            throw $e;
        }
    }
}
