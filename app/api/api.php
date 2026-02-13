<?php

header('Content-Type: application/json');

require_once __DIR__ . '/../controllers/productosController.php';
require_once __DIR__ . '/../controllers/ventasController.php';
require_once __DIR__ . '/../controllers/inventarioController.php';
require_once __DIR__ . '/../controllers/clientesController.php';
require_once __DIR__ . '/../controllers/usuariosController.php';
require_once __DIR__ . '/../controllers/dashboardController.php';
require_once __DIR__ . '/../helpers/session.php';

$method = $_SERVER['REQUEST_METHOD'];
$path = str_replace('/PV_Witmac/app/api/api.php', '', $_SERVER['REQUEST_URI']);
$uri = explode('/', trim($path, '/'));

try {

    $resource = $uri[0] ?? null;   // Recurso principal: elementos, cables, etc.
    $action   = $uri[1] ?? null;   // Acción: nuevo, editar, eliminar, listar

    if ($method !== 'POST') {
        http_response_code(405);
        echo json_encode(['error' => 'Método no permitido, usa POST']);
        exit;
    }

    switch ($resource) {

        case 'productos':
            $elementos = new productosController();
            switch ($action) {
                case 'nuevo':
                    $elementos->nuevo();
                    break;

                case 'editar':
                    $elementos->update();
                    break;

                case 'eliminar':
                    $elementos->destroy();
                    break;

                case 'listar':
                    $elementos->index();
                    break;

                case 'estatus':
                    $elementos->cambiarEstado();
                    break;
                    
                case 'buscar':
                    $elementos->searchActivos();
                    break;

                default:
                    http_response_code(404);
                    echo json_encode(['error' => 'Acción de elementos no encontrada']);
                    break;
            }
            break;

        case 'ventas':
            $ventas = new ventasController();
            switch ($action) {
                case 'nuevo':
                    $ventas->nuevo();
                    break;

                case 'listar':
                    $ventas->index();
                    break;

                case 'estatus':
                    $ventas->cambiarEstado();
                    break; 
                
                case 'full':
                    $ventas->getFullVentas();
                    break;
                case 'abonar':
                    $ventas->abonar();
                    break;
                default:
                    http_response_code(404);
                    echo json_encode(['error' => 'Acción de ventas no encontrada']);
                    break;
            }
            break;

        case 'inventario':
            $inventario = new inventarioController();
            switch ($action) {
                case 'registrar':
                    $inventario->registrarMovimiento();
                    break;

                case 'listar':
                    $inventario->listar();
                    break;

                case 'resumen':
                    $inventario->resumenStock();
                    break;

                default:
                    http_response_code(404);
                    echo json_encode(['error' => 'Acción de inventario no encontrada']);
                    break;
            }
            break;

        case 'clientes':
            $clientes = new clientesController();
            switch ($action) {
                case 'nuevo':
                    $clientes->nuevo();
                    break;

                case 'listar':
                    $clientes->index();
                    break;

                case 'activos':
                    $clientes->activos();
                    break;

                case 'editar':
                    $clientes->update();
                    break;

                case 'estatus':
                    $clientes->cambiarEstado();
                    break;

                case 'ventas':
                    $clientes->ventasCliente();
                    break;

                default:
                    http_response_code(404);
                    echo json_encode(['error' => 'Acción de clientes no encontrada']);
                    break;
            }
            break;

        case 'usuarios':
            $usuarios = new usuariosController();
            switch ($action) {
                case 'nuevo':
                    $usuarios->nuevo();
                    break;

                case 'listar':
                    $usuarios->index();
                    break;

                case 'autenticar':
                    $usuarios->autenticar();
                    break;

                case 'editar':
                    $usuarios->update();
                    break;

                case 'estatus':
                    $usuarios->cambiarEstado();
                    break;

                case 'ventas':
                    $usuarios->ventasUsuario();
                    break;

                default:
                    http_response_code(404);
                    echo json_encode(['error' => 'Acción de usuarios no encontrada']);
                    break;
            }
            break;

        case 'dashboard':
            $dashboard = new dashboardController();
            switch ($action) {
                case 'resumen':
                    $dashboard->index();
                    break;

                case 'estadisticas':
                    $dashboard->estadisticas();
                    break;

                case 'ventas-semana':
                    $dashboard->ventasSemana();
                    break;

                case 'ultimas-ventas':
                    $dashboard->ultimasVentas();
                    break;

                case 'productos-vendidos':
                    $dashboard->productosMasVendidos();
                    break;

                case 'ventas-vendedor':
                    $dashboard->ventasPorVendedor();
                    break;
                
                case 'exportar-ventas':
                    $dashboard->exportarVentas();
                    break;

                default:
                    http_response_code(404);
                    echo json_encode(['error' => 'Acción de dashboard no encontrada']);
                    break;
            }
            break;
        case 'session':
            switch ($action) {

                case 'logout':
                    logout();
                    break;
                
                case 'info':
                    response([
                        'usuario_id' => $_SESSION['usuario_id'] ?? null,
                        'nombre' => $_SESSION['usuario_nombre'] ?? null,
                        'rol' => $_SESSION['rol'] ?? null
                    ]);
                    break;

                default:
                    error('Acción no válida', 400);
                    echo json_encode(['error' => 'Acción de session no encontrada']);
                    break;
            }
            break;


        default:
            http_response_code(404);
            echo json_encode(['error' => 'Recurso no encontrado']);
            break;
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
