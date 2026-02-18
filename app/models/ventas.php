<?php
require_once __DIR__ . '/../core/base.php';
require_once __DIR__ . '/inventario.php';

class Ventas extends BaseModel
{

    protected $table = 'ventas';

    protected $fields = [
        'folio',
        'cliente_id',
        'vendedor_id',
        'subtotal',
        'descuento',
        'total',
        'monto_pagado',
        'saldo',
        'metodo_pago',
        'estado'
    ];

    public function getVentaConDetalle($id)
    {
        $stmt = $this->db->prepare("
            SELECT v.*, c.nombre as cliente_nombre, u.nombre as vendedor_nombre
            FROM {$this->table} v
            LEFT JOIN clientes c ON v.cliente_id = c.id
            LEFT JOIN usuarios u ON v.vendedor_id = u.id
            WHERE v.id = :id
        ");
        $stmt->execute(['id' => $id]);
        $venta = $stmt->fetch();

        if ($venta) {
            $stmt = $this->db->prepare("
                SELECT dv.*, p.nombre as producto_nombre
                FROM detalle_ventas dv
                LEFT JOIN productos p ON dv.producto_id = p.id
                WHERE dv.venta_id = :venta_id
            ");
            $stmt->execute(['venta_id' => $id]);
            $venta['detalles'] = $stmt->fetchAll();
        }

        return $venta;
    }

    public function getAllConDetalles()
    {
        $stmt = $this->db->prepare("
            SELECT v.*, c.nombre as cliente_nombre, u.nombre as vendedor_nombre
            FROM {$this->table} v
            LEFT JOIN clientes c ON v.cliente_id = c.id
            LEFT JOIN usuarios u ON v.vendedor_id = u.id
            ORDER BY v.fecha_venta DESC
        ");
        $stmt->execute();
        return $stmt->fetchAll();
    }

    public function getFullVentas($data)
    {
        $stmt = $this->db->prepare("
        SELECT v.*, c.nombre as cliente_nombre, u.nombre as vendedor_nombre
        FROM {$this->table} v
        LEFT JOIN clientes c ON v.cliente_id = c.id
        LEFT JOIN usuarios u ON v.vendedor_id = u.id
        WHERE DATE(v.fecha_venta) BETWEEN :fechaInicio AND :fechaFin
        ORDER BY v.fecha_venta DESC
    ");

        $stmt->execute([
            'fechaInicio' => $data->fechaInicio,
            'fechaFin' => $data->fechaFin
        ]);

        $ventas = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($ventas as &$venta) {
            $stmtDetalles = $this->db->prepare("
            SELECT dv.*, p.nombre as producto_nombre
            FROM detalle_ventas dv
            LEFT JOIN productos p ON dv.producto_id = p.id
            WHERE dv.venta_id = :venta_id
        ");

            $stmtDetalles->execute([
                'venta_id' => $venta['id']
            ]);

            $venta['detalles'] = $stmtDetalles->fetchAll(PDO::FETCH_ASSOC);
        }

        return $ventas;
    }


    public function cambiarEstado($id, $estado)
    {
        if (!in_array($estado, ['completada', 'cancelada', 'pendiente'])) {
            throw new Exception('Estado no válido: completada, cancelada o pendiente');
        }

        return $this->update($id, ['estado' => $estado]);
    }


    public function crearVentaCompleta($cliente_id, $vendedor_id, $productos, $descuento, $metodo_pago, $monto_pagado = 0)
    {
        try {

            $this->db->beginTransaction();

            $subtotal = 0;
            $productosDB = [];

            foreach ($productos as $producto) {

                $stmt = $this->db->prepare("
                SELECT id, codigo, stock, precio_venta 
                FROM productos 
                WHERE codigo = :codigo AND activo = true
                FOR UPDATE
            ");

                $stmt->execute(['codigo' => $producto['codigo']]);
                $dbProducto = $stmt->fetch();

                if (!$dbProducto) {
                    throw new Exception("Producto no encontrado: " . $producto['codigo']);
                }

                if ($dbProducto['stock'] < $producto['cantidad']) {
                    throw new Exception("Stock insuficiente para: " . $producto['codigo']);
                }

                $cantidad = (int)$producto['cantidad'];
                $subtotalProducto = $dbProducto['precio_venta'] * $cantidad;

                $subtotal += $subtotalProducto;

                // Guardamos info ya validada
                $productosDB[] = [
                    'id' => $dbProducto['id'],
                    'codigo' => $dbProducto['codigo'],
                    'precio' => $dbProducto['precio_venta'],
                    'cantidad' => $cantidad,
                    'subtotal' => $subtotalProducto
                ];
            }

            if ($descuento > $subtotal) {
                throw new Exception("El descuento no puede ser mayor al subtotal");
            }

            $total = $subtotal - $descuento;

            // Validar monto pagado
            if ($monto_pagado < 0) {
                throw new Exception("El monto pagado no puede ser negativo");
            }

            // Calcular saldo
            $saldo = $total - $monto_pagado;

            // El saldo puede ser negativo (cambio) o positivo (deuda)
            // Si es negativo, lo dejamos como 0 para el registro de venta
            $saldo_registro = max(0, $saldo);

            $folio = 'V-' . date('Ymd') . '-' . str_pad(random_int(1, 9999), 4, '0', STR_PAD_LEFT);

            $venta_id = $this->create([
                'folio' => $folio,
                'cliente_id' => $cliente_id,
                'vendedor_id' => $vendedor_id,
                'subtotal' => $subtotal,
                'descuento' => $descuento,
                'total' => $total,
                'monto_pagado' => $monto_pagado,
                'saldo' => $saldo_registro,
                'metodo_pago' => $metodo_pago,
                'estado' => $saldo_registro > 0 ? 'pendiente' : 'completada'
            ]);

            $inventario = new Inventario();

            foreach ($productosDB as $producto) {

                $stmt = $this->db->prepare("
                INSERT INTO detalle_ventas 
                (venta_id, producto_id, cantidad, precio_unitario, subtotal)
                VALUES (:venta_id, :producto_id, :cantidad, :precio_unitario, :subtotal)
            ");

                $stmt->execute([
                    'venta_id' => $venta_id,
                    'producto_id' => $producto['id'],
                    'cantidad' => $producto['cantidad'],
                    'precio_unitario' => $producto['precio'],
                    'subtotal' => $producto['subtotal']
                ]);

                $inventario->registrarMovimiento(
                    $producto['id'],
                    'salida',
                    $producto['cantidad'],
                    'Venta ' . $folio,
                    $vendedor_id
                );
            }

            $this->db->commit();

            return [
                'venta_id' => $venta_id,
                'folio' => $folio,
                'total' => $total,
                'monto_pagado' => $monto_pagado,
                'saldo' => $saldo_registro,
                'cambio' => $saldo < 0 ? abs($saldo) : 0
            ];
        } catch (Exception $e) {

            $this->db->rollBack();
            throw $e;
        }
    }


    public function registrarAbono($venta_id, $monto_abono)
    {
        try {
            $this->db->beginTransaction();

            // 1. Obtener la venta actual con lock para evitar condiciones de carrera
            $stmt = $this->db->prepare("
            SELECT id, folio, total, monto_pagado, saldo, estado 
            FROM ventas 
            WHERE id = :id 
            FOR UPDATE
        ");
            $stmt->execute(['id' => $venta_id]);
            $venta = $stmt->fetch();

            if (!$venta) {
                throw new Exception("Venta no encontrada");
            }

            // 2. Validaciones
            if ($venta['estado'] === 'completada') {
                throw new Exception("La venta ya está completamente pagada");
            }

            if ($monto_abono <= 0) {
                throw new Exception("El monto del abono debe ser mayor a cero");
            }

            if ($monto_abono > $venta['saldo']) {
                throw new Exception("El abono no puede ser mayor al saldo pendiente ($" . number_format($venta['saldo'], 2) . ")");
            }

            // 3. Calcular nuevos valores
            $nuevo_monto_pagado = $venta['monto_pagado'] + $monto_abono;
            $nuevo_saldo = $venta['saldo'] - $monto_abono;
            $nuevo_estado = ($nuevo_saldo == 0) ? 'completada' : 'pendiente';

            // 4. Actualizar la venta (solo actualizamos los campos existentes)
            $stmt = $this->db->prepare("
            UPDATE ventas 
            SET monto_pagado = :monto_pagado,
                saldo = :saldo,
                estado = :estado
            WHERE id = :id
        ");

            $stmt->execute([
                'monto_pagado' => $nuevo_monto_pagado,
                'saldo' => $nuevo_saldo,
                'estado' => $nuevo_estado,
                'id' => $venta_id
            ]);

            $this->db->commit();

            return [
                'success' => true,
                'venta_id' => $venta_id,
                'folio' => $venta['folio'],
                'abono' => $monto_abono,
                'nuevo_monto_pagado' => $nuevo_monto_pagado,
                'nuevo_saldo' => $nuevo_saldo,
                'nuevo_estado' => $nuevo_estado,
                'mensaje' => $nuevo_estado === 'completada' ?
                    '¡Venta liquidada completamente!' :
                    'Abono registrado correctamente'
            ];
        } catch (Exception $e) {
            $this->db->rollBack();
            throw $e;
        }
    }
}
