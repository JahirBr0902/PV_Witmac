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
                WHERE DATE(v.fecha_venta) BETWEEN ? AND ?";
        
        $params = [$filtros['fechaInicio'], $filtros['fechaFin']];

        if (!empty($filtros['estado']) && $filtros['estado'] !== 'Todos') {
            $sql .= " AND v.estado = ?";
            $params[] = $filtros['estado'];
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

    public function registrarAbono($venta_id, $monto, $metodo_pago = 'efectivo') {
        require_once __DIR__ . '/caja.php';
        $cajaModel = new Caja();
        $caja = $cajaModel->getCajaAbierta();

        if (!$caja) {
            throw new Exception("No hay una caja abierta para registrar el abono.");
        }

        $this->db->beginTransaction();
        try {
            $v = $this->getById($venta_id);
            if (!$v || $v['estado'] === 'cancelada') throw new Exception("Venta no válida");

            $nuevoPagado = (float)$v['monto_pagado'] + (float)$monto;
            $nuevoSaldo = max(0, (float)$v['total'] - $nuevoPagado);

            // 1. Registrar el abono en la tabla abonos
            require_once __DIR__ . '/abonos.php';
            $abonoModel = new Abonos();
            $abonoModel->create([
                'venta_id' => $venta_id,
                'caja_id' => $caja['id'],
                'usuario_id' => $_SESSION['usuario_id'],
                'monto' => $monto,
                'metodo_pago' => $metodo_pago
            ]);

            // 2. Actualizar el saldo de la venta
            $this->update($venta_id, [
                'monto_pagado' => $nuevoPagado,
                'saldo' => $nuevoSaldo,
                'estado' => $nuevoSaldo <= 0 ? 'completada' : 'pendiente'
            ]);

            $this->db->commit();
            return true;
        } catch (Exception $e) {
            $this->db->rollBack();
            throw $e;
        }
    }}
