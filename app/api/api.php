<?php
header('Content-Type: application/json');
ini_set('display_errors', 0); // Evitar que errores PHP salgan como HTML
error_reporting(E_ALL);

require_once __DIR__ . '/../controllers/productosController.php';
require_once __DIR__ . '/../controllers/ventasController.php';
require_once __DIR__ . '/../controllers/inventarioController.php';
require_once __DIR__ . '/../controllers/clientesController.php';
require_once __DIR__ . '/../controllers/usuariosController.php';
require_once __DIR__ . '/../controllers/dashboardController.php';
require_once __DIR__ . '/../controllers/cajaController.php';
require_once __DIR__ . '/../controllers/movimientosCajaController.php';
require_once __DIR__ . '/../helpers/session.php';

$method = $_SERVER['REQUEST_METHOD'];
$path = str_replace('/PV_Witmac/app/api/api.php', '', $_SERVER['REQUEST_URI']);
$uri = explode('/', trim($path, '/'));

try {
    $resource = $uri[0] ?? null;
    $action   = $uri[1] ?? null;

    if ($method !== 'POST') {
        http_response_code(405);
        echo json_encode(['error' => 'Método no permitido, usa POST']);
        exit;
    }

    switch ($resource) {
        case 'movimientos':
            $ctrl = new movimientosCajaController();
            switch ($action) {
                case 'registrar': $ctrl->registrar(); break;
                case 'listar': $ctrl->listar(); break;
                default: error('Acción no encontrada'); break;
            }
            break;

        case 'caja':
            $ctrl = new cajaController();
            switch ($action) {
                case 'estado': $ctrl->estado(); break;
                case 'abrir': $ctrl->abrir(); break;
                case 'cerrar': $ctrl->cerrar(); break;
                case 'historial': $ctrl->historial(); break;
                case 'detalle': $ctrl->detalle(); break;
                default: error('Acción no encontrada'); break;
            }
            break;

        case 'productos':
            $ctrl = new productosController();
            switch ($action) {
                case 'nuevo': $ctrl->nuevo(); break;
                case 'editar': $ctrl->editar(); break;
                case 'listar': $ctrl->listar(); break;
                case 'estatus': $ctrl->estatus(); break;
                case 'buscar': $ctrl->buscar(); break;
                default: error('Acción no encontrada'); break;
            }
            break;

        case 'ventas':
            $ctrl = new ventasController();
            switch ($action) {
                case 'nuevo': $ctrl->nuevo(); break;
                case 'listar': $ctrl->index(); break;
                case 'abonar': $ctrl->abonar(); break;
                case 'abonarMasivo': $ctrl->abonarMasivo(); break;
                case 'full': $ctrl->getFullVentas(); break;
                case 'cancelar': $ctrl->cancelar(); break;
                case 'editar': $ctrl->editar(); break;
                default: error('Acción no encontrada'); break;
            }
            break;

        case 'inventario':
            $ctrl = new inventarioController();
            switch ($action) {
                case 'registrar': $ctrl->registrar(); break;
                case 'reporte': $ctrl->reporte(); break;
                case 'listar': $ctrl->historial(); break;
                default: error('Acción no encontrada'); break;
            }
            break;

        case 'clientes':
            $ctrl = new clientesController();
            switch ($action) {
                case 'nuevo': $ctrl->nuevo(); break;
                case 'editar': $ctrl->update(); break;
                case 'listar': $ctrl->index(); break;
                case 'estatus': $ctrl->cambiarEstado(); break;
                case 'ventas': $ctrl->ventasCliente(); break;
                default: error('Acción no encontrada'); break;
            }
            break;

        case 'usuarios':
            $ctrl = new usuariosController();
            switch ($action) {
                case 'nuevo': $ctrl->nuevo(); break;
                case 'editar': $ctrl->update(); break;
                case 'listar': $ctrl->listar(); break;
                case 'estatus': $ctrl->estatus(); break;
                case 'autenticar': $ctrl->autenticar(); break;
                default: error('Acción no encontrada'); break;
            }
            break;

        case 'dashboard':
            $ctrl = new dashboardController();
            switch ($action) {
                case 'resumen': $ctrl->resumen(); break;
                default: error('Acción no encontrada'); break;
            }
            break;

        case 'session':
            switch ($action) {
                case 'logout': logout(); break;
                case 'info':
                    response([
                        'usuario_id' => $_SESSION['usuario_id'] ?? null,
                        'nombre' => $_SESSION['usuario_nombre'] ?? null,
                        'rol' => $_SESSION['rol'] ?? null
                    ]);
                    break;
                default: error('Acción no encontrada'); break;
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
