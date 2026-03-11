<?php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Función para verificar autenticación en páginas HTML
function checkAuth() {
    if (!isset($_SESSION['usuario_id'])) {
        header('Location: login.php');
        exit();
    }
}

// Función para verificar autenticación en el API (devuelve error JSON en vez de redireccionar)
function checkAuthApi() {
    if (!isset($_SESSION['usuario_id'])) {
        http_response_code(401);
        echo json_encode([
            'error' => 'Sesión expirada',
            'session_expired' => true
        ]);
        exit();
    }
}


function isAdmin() {
    return isset($_SESSION['rol']) && $_SESSION['rol'] === 'admin';
}

function logout() {
    session_destroy();
    response(['success' => true, 'message' => 'Sesión cerrada']);
}
?>