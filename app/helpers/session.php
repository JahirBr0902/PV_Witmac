<?php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Función para verificar autenticación
function checkAuth() {
    if (!isset($_SESSION['usuario_id'])) {
        header('Location: login.php');
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