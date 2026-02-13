// Función para obtener el usuario loguedo
function obtenerUsuario() {
    const usuarioJSON = localStorage.getItem('usuario');
    return usuarioJSON ? JSON.parse(usuarioJSON) : null;
}

// Función para verificar si el usuario está logueado
function estaAutenticado() {
    return localStorage.getItem('token') !== null;
}

// Función para cerrar sesión
function cerrarSesion() {
    localStorage.removeItem('usuario');
    localStorage.removeItem('token');
    window.location.href = 'login.php';
}

// Función para redirigir a login si no está autenticado
function verificarAutenticacion() {
    if (!estaAutenticado()) {
        window.location.href = 'login.php';
    }
}

// Obtener la URL base del API
function obtenerURLAPI() {
    const baseUrl = window.location.pathname;
    const projectPath = baseUrl.substring(0, baseUrl.indexOf('/public'));
    return projectPath + '/app/api/api.php';
}

// Función para hacer peticiones al API con autenticación
async function fetchAPI(endpoint, options = {}) {
    const url = obtenerURLAPI() + endpoint;
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };

    const response = await fetch(url, {
        method: options.method || 'POST',
        headers: headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
        ...options
    });

    if (response.status === 401) {
        cerrarSesion();
    }

    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(data.error || 'Error en la petición');
    }

    return data;
}

// Mostrar notificación
function mostrarNotificacion(titulo, mensaje, tipo = 'success') {
    Swal.fire({
        icon: tipo,
        title: titulo,
        text: mensaje,
        timer: 2000,
        showConfirmButton: false
    });
}

// Confirmar acción
async function confirmarAccion(titulo = '¿Estás seguro?', mensaje = '') {
    const result = await Swal.fire({
        title: titulo,
        text: mensaje,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#667eea',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Sí, continuar',
        cancelButtonText: 'Cancelar'
    });

    return result.isConfirmed;
}
