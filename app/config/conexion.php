<?php
date_default_timezone_set('America/Mexico_City');

class Conexion {
    private static $conexion = null;

    public static function getConexion() {
        if (self::$conexion === null) {
            try {
            $host = '10.2.1.23';
            $db   = 'TiendaWitmac';
            $user = 'admin';
            $pass = 'Tmac24';

                $dsn = "pgsql:host=$host;dbname=$db";

                self::$conexion = new PDO($dsn, $user, $pass, [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                ]);
                self::$conexion->exec("SET TIME ZONE 'America/Mexico_City'");
            } catch (PDOException $e) {
                http_response_code(500);
                echo json_encode([
                    'error' => 'Error de conexión a la base de datos',
                    'detalle' => $e->getMessage()
                ]);
                exit;
            }
        }

        return self::$conexion;
    }

    // Función para verificar autenticación
function checkAuth() {
    if (!isset($_SESSION['usuario_id'])) {
        header('Location: login.php');
        exit();
    }
}

// Función para verificar si es admin
function isAdmin() {
    return isset($_SESSION['rol']) && $_SESSION['rol'] === 'admin';
}

}
