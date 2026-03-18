<?php
require_once '../app/helpers/session.php';
checkAuth();
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title id="pageTitle">Punto de Venta</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/font/bootstrap-icons.css">
    <link rel="stylesheet" href="assets/css/styles.css">
    <script src="https://unpkg.com/html5-qrcode" type="text/javascript"></script>
</head>
<body>
    <!-- Navbar -->
    <nav class="navbar navbar-expand-lg navbar-dark bg-primary">
        <div class="container-fluid">
            <a class="navbar-brand" href="#" id="navbarBrand">
                <i class="bi bi-shop-window"></i> Punto de Venta
            </a>
            <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
                <span class="navbar-toggler-icon"></span>
            </button>
            <div class="collapse navbar-collapse" id="navbarNav">
                <ul class="navbar-nav ms-auto align-items-center">
                    <li class="nav-item me-3" id="cajaStatusIndicator">
                        <!-- Se llena dinámicamente desde caja.js -->
                    </li>
                    <li class="nav-item">
                        <a class="nav-link active" href="#" data-page="dashboard">
                            <i class="bi bi-house"></i> Inicio
                        </a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link" href="#" data-page="ventas">
                            <i class="bi bi-cart"></i> Nueva Venta
                        </a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link" href="#" data-page="clientes">
                            <i class="bi bi-people"></i> Clientes
                        </a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link" href="#" data-page="creditos">
                            <i class="bi bi-cash-stack"></i> Créditos
                        </a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link" href="#" data-page="reportes">
                            <i class="bi bi-graph-up"></i> Reportes
                        </a>
                    </li>
                    <?php if ($_SESSION['rol'] === 'admin'): ?>
                    <li class="nav-item dropdown">
                        <a class="nav-link dropdown-toggle" href="#" id="adminDropdown" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                            <i class="bi bi-gear"></i> Administración
                        </a>
                        <ul class="dropdown-menu dropdown-menu-end shadow" aria-labelledby="adminDropdown">
                            <li><a class="dropdown-item" href="#" data-page="estadisticas"><i class="bi bi-bar-chart-steps me-2"></i> Estadísticas</a></li>
                            <li><hr class="dropdown-divider"></li>
                            <li><a class="dropdown-item" href="#" data-page="productos"><i class="bi bi-box me-2"></i> Productos</a></li>
                            <li><a class="dropdown-item" href="#" data-page="inventario"><i class="bi bi-boxes me-2"></i> Inventario</a></li>
                            <li><hr class="dropdown-divider"></li>
                            <li><a class="dropdown-item" href="#" data-page="cortes"><i class="bi bi-safe2 me-2"></i> Cortes de Caja</a></li>
                            <li><a class="dropdown-item" href="#" data-page="usuarios"><i class="bi bi-person-badge me-2"></i> Usuarios</a></li>
                            <li><hr class="dropdown-divider"></li>
                            <li><a class="dropdown-item" href="#" data-page="configuracion"><i class="bi bi-gear me-2"></i> Configuración</a></li>
                        </ul>
                    </li>
                    <?php endif; ?>
                </ul>
                <div class="ms-lg-3 d-flex align-items-center text-white border-start ps-lg-3 mt-3 mt-lg-0">
                    <span class="me-3">
                        <i class="bi bi-person-circle"></i> 
                        <?php echo htmlspecialchars($_SESSION['usuario_nombre']); ?>
                        <span class="badge bg-light text-dark ms-1"><?php echo $_SESSION['rol']; ?></span>
                    </span>
                    <button class="btn btn-outline-light btn-sm me-2" onclick="window.open('manual/', '_blank')">
                        <i class="bi bi-question-circle"></i> Ayuda
                    </button>
                    <button class="btn btn-outline-light btn-sm" id="btnLogout">
                        <i class="bi bi-box-arrow-right"></i> Salir
                    </button>
                </div>
            </div>
        </div>
    </nav>

    <!-- Contenido principal -->
    <div class="container-fluid mt-4">
        <div id="pageContent"></div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    
    <script src="https://cdn.jsdelivr.net/npm/xlsx/dist/xlsx.full.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/xlsx-js-style@1.2.0/dist/xlsx.bundle.js"></script>

    <script src="https://cdn.jsdelivr.net/npm/jspdf/dist/jspdf.umd.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/jspdf-autotable"></script>



    <script src="assets/js/app.js"></script>
    <script src="assets/js/caja.js"></script>
    <script src="assets/js/dashboard.js"></script>
    <script src="assets/js/ventas.js"></script>
    <script src="assets/js/productos.js"></script>
    <script src="assets/js/clientes.js"></script>
    <script src="assets/js/usuarios.js"></script>
    <script src="assets/js/inventarios.js"></script>
    <script src="assets/js/reportes.js"></script>
    <script src="assets/js/creditos.js"></script>
    <script src="assets/js/configuracion.js"></script>
    <script src="assets/js/estadisticas.js"></script>
    <script src="assets/js/main.js"></script>
</body>
</html>