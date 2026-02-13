// Variables globales
let currentPage = "dashboard";
let cart = [];
let currentUser = null;

// Inicialización
document.addEventListener("DOMContentLoaded", function () {
  initNavigation();
  initLogout();
  loadPage("dashboard");
});

/*
async function loadSession() {
    try {
        currentUser = await apiPost("session/info");

        if (!currentUser || !currentUser.rol) {
            window.location.href = "login.php";
            return;
        }

        if (currentUser.rol !== 'admin') {
            ocultarOpcionesAdmin();
        }

    } catch (error) {
        console.error("Error cargando sesión:", error);
        window.location.href = "login.php";
    }
}
*/

// Navegación
function initNavigation() {
  const navLinks = document.querySelectorAll("[data-page]");
  navLinks.forEach((link) => {
    link.addEventListener("click", function (e) {
      e.preventDefault();
      const page = this.dataset.page;

      // Actualizar links activos
      navLinks.forEach((l) => l.classList.remove("active"));
      this.classList.add("active");

      loadPage(page);
    });
  });
}

// Cerrar sesión
function initLogout() {
  document
    .getElementById("btnLogout")
    .addEventListener("click", async function () {
      const result = await Swal.fire({
        title: "¿Cerrar sesión?",
        text: "¿Estás seguro de que deseas cerrar sesión?",
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "Sí, salir",
        cancelButtonText: "Cancelar",
      });

      if (result.isConfirmed) {
        try {
          const data = await apiPost("session/logout");

          if (data.success) {
            window.location.href = "login.php";
          }
        } catch (error) {
          console.error("Error al cerrar sesión:", error);
        }
      }
    });
}

// Cargar página
function loadPage(page) {
  currentPage = page;
  const content = document.getElementById("pageContent");

  switch (page) {
    case "dashboard":
      loadDashboard();
      break;
    case "ventas":
      loadVentas();
      break;
    case "productos":
      loadProductos();
      break;
    case "clientes":
      loadClientes();
      break;
    case "reportes":
      loadReportes();
      break;
    case "usuarios":
      loadUsuarios();
      break;
  }
}

// Dashboard
async function loadDashboard() {
  const content = document.getElementById("pageContent");
  content.innerHTML = `
        <div class="fade-in">
            
            <div class="row" id="statsCards">
                <div class="col-md-3 mb-3">
                    <div class="card stats-card primary">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <h6 class="text-muted mb-1">Ventas Hoy</h6>
                                <h3 class="mb-0" id="ventasHoy">$0.00</h3>
                            </div>
                            <i class="bi bi-cash-stack stats-icon"></i>
                        </div>
                    </div>
                </div>
                <div class="col-md-3 mb-3">
                    <div class="card stats-card success">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <h6 class="text-muted mb-1">Total Productos</h6>
                                <h3 class="mb-0" id="totalProductos">0</h3>
                            </div>
                            <i class="bi bi-box-seam stats-icon"></i>
                        </div>
                    </div>
                </div>
                <div class="col-md-3 mb-3">
                    <div class="card stats-card warning">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <h6 class="text-muted mb-1">Cuentas Pendientes</h6>
                                <h3 class="mb-0" id="totalClientes">0</h3>
                            </div>
                            <i class="bi bi-people stats-icon"></i>
                        </div>
                    </div>
                </div>
                <div class="col-md-3 mb-3">
                    <div class="card stats-card info">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <h6 class="text-muted mb-1">Stock Bajo</h6>
                                <h3 class="mb-0" id="stockBajo">0</h3>
                            </div>
                            <i class="bi bi-exclamation-triangle stats-icon"></i>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="row mt-4">
                <div class="col-md-8">
                    <div class="card">
                        <div class="card-header">
                            <i class="bi bi-graph-up"></i> Ventas de los Últimos 7 Días
                        </div>
                        <div class="card-body">
                            <canvas id="ventasChart"></canvas>
                        </div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="card">
                        <div class="card-header">
                            <i class="bi bi-clock-history"></i> Últimas Ventas
                        </div>
                        <div class="card-body" id="ultimasVentas">
                            <p class="text-center text-muted">Cargando...</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

  await loadDashboardData();
}

async function loadDashboardData() {
  try {
    const data = await apiPost("dashboard/resumen");

    // Actualizar estadísticas
    document.getElementById("ventasHoy").textContent =
      "$" + parseFloat(data.estadisticas.ventasHoy || 0).toFixed(2);

    document.getElementById("totalProductos").textContent =
      data.estadisticas.totalProductos || 0;

    document.getElementById("totalClientes").textContent =
      data.estadisticas.totalClientes || 0;

    document.getElementById("stockBajo").textContent =
      data.estadisticas.stockBajo || 0;

    // Gráfica
    const ctx = document.getElementById("ventasChart").getContext("2d");

    new Chart(ctx, {
      type: "line",
      data: {
        labels: data.ventasSemana.labels,
        datasets: [
          {
            label: "Ventas ($)",
            data: data.ventasSemana.valores,
            tension: 0.4,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        scales: {
          y: { beginAtZero: true },
        },
      },
    });

    // Últimas ventas
    let ventasHTML = "";

    if (data.ultimasVentas?.length) {
      data.ultimasVentas.forEach((venta) => {
        ventasHTML += `
                    <div class="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom">
                        <div>
                            <strong>${venta.folio}</strong><br>
                            <small class="text-muted">${venta.cliente}</small>
                        </div>
                        <div class="text-end">
                            <strong class="text-success">$${parseFloat(venta.total).toFixed(2)}</strong><br>
                            <small class="text-muted">${venta.fecha}</small>
                        </div>
                    </div>
                `;
      });
    } else {
      ventasHTML =
        '<p class="text-center text-muted">No hay ventas registradas</p>';
    }

    document.getElementById("ultimasVentas").innerHTML = ventasHTML;
  } catch (error) {
    console.error("Error cargando dashboard:", error);
  }
}

// Funciones auxiliares
function formatCurrency(amount) {
  return "$" + parseFloat(amount).toFixed(2);
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString("es-MX");
}

function showLoading() {
  Swal.fire({
    title: "Cargando...",
    allowOutsideClick: false,
    didOpen: () => {
      Swal.showLoading();
    },
  });
}

function hideLoading() {
  Swal.close();
}

// ========== MÓDULO DE PRODUCTOS ==========
async function loadProductos() {
  const content = document.getElementById("pageContent");
  content.innerHTML = `
        <div class="fade-in">
            <div class="d-flex justify-content-between align-items-center mb-4">
                <h2><i class="bi bi-box"></i> Productos</h2>
                <button class="btn btn-primary" onclick="showProductoModal()">
                    <i class="bi bi-plus-circle"></i> Nuevo Producto
                </button>
            </div>
            
            <div class="card">
                <div class="card-body">
                    <div class="table-responsive">
                        <table class="table table-hover" id="productosTable">
                            <thead>
                                <tr>
                                    <th>Código</th>
                                    <th>Nombre</th>
                                    <th>Precio Compra</th>
                                    <th>Precio Venta</th>
                                    <th>Stock</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody id="productosTableBody">
                                <tr><td colspan="6" class="text-center">Cargando...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Modal Producto -->
        <div class="modal fade" id="productoModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="productoModalTitle">Nuevo Producto</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="productoForm">
                            <input type="hidden" id="productoId">
                            <div class="mb-3">
                                <label class="form-label">Código *</label>
                                <input type="text" class="form-control" id="productoCodigo" required>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Nombre *</label>
                                <input type="text" class="form-control" id="productoNombre" required>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Descripción</label>
                                <textarea class="form-control" id="productoDescripcion" rows="2"></textarea>
                            </div>
                            <div class="row">
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">Precio Compra *</label>
                                    <input type="number" class="form-control" id="productoPrecioCompra" step="0.01" min="0" required>
                                </div>
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">Precio Venta *</label>
                                    <input type="number" class="form-control" id="productoPrecioVenta" step="0.01" min="0" required>
                                </div>
                            </div>
                            <div class="row">
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">Stock Inicial</label>
                                    <input type="number" class="form-control" id="productoStock" min="0" value="0">
                                </div>
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">Stock Mínimo</label>
                                    <input type="number" class="form-control" id="productoStockMinimo" min="0" value="5">
                                </div>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                        <button type="button" class="btn btn-primary" onclick="saveProducto()">Guardar</button>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Modal Ajustar Stock -->
        <div class="modal fade" id="stockModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Ajustar Stock</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <input type="hidden" id="stockProductoId">
                        <p><strong>Producto:</strong> <span id="stockProductoNombre"></span></p>
                        <p><strong>Stock actual:</strong> <span id="stockActual"></span></p>
                        <div class="mb-3">
                            <label class="form-label">Tipo de movimiento</label>
                            <select class="form-select" id="stockTipo">
                                <option value="entrada">Entrada</option>
                                <option value="salida">Salida</option>
                            </select>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Cantidad</label>
                            <input type="number" class="form-control" id="stockCantidad" min="1" value="1">
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Motivo</label>
                            <input type="text" class="form-control" id="stockMotivo" placeholder="Ej: Compra, Merma, Ajuste">
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                        <button type="button" class="btn btn-primary" onclick="ajustarStock()">Guardar</button>
                    </div>
                </div>
            </div>
        </div>
    `;

  await loadProductosTable();
}

async function loadProductosTable() {
  try {
    const data = await apiPost("productos/listar");
    const tbody = document.getElementById("productosTableBody");

    if (Array.isArray(data) && data.length > 0) {
      let html = "";

      data.forEach((producto) => {
        const stockClass =
          producto.stock <= producto.stock_minimo
            ? "text-danger"
            : "text-success";
        const botonEstado = producto.activo
          ? `
        <button class="btn btn-sm btn-success"
            onclick="toggleProductoEstado(${producto.id}, false)">
            <i class="bi bi-check-circle"></i>
        </button>
      `
          : `
        <button class="btn btn-sm btn-danger"
            onclick="toggleProductoEstado(${producto.id}, true)">
            <i class="bi bi-x-circle"></i>
        </button>
      `;

        html += `
                    <tr>
                        <td>${producto.id}</td>
                        <td>${producto.nombre}</td>
                        <td>$${parseFloat(producto.precio_compra).toFixed(2)}</td>
                        <td>$${parseFloat(producto.precio_venta).toFixed(2)}</td>
                        <td>
                            <span class="badge ${stockClass}">
                                ${producto.stock}
                            </span>
                        </td>
                        <td>
                            <button class="btn btn-sm btn-primary"
                                onclick='showStockModal(${JSON.stringify(producto)})'>
                                <i class="bi bi-arrow-left-right"></i>
                            </button>

                            <button class="btn btn-sm btn-warning"
                                onclick='editProducto(${JSON.stringify(producto)})'>
                                <i class="bi bi-pencil"></i>
                            </button>

                            ${botonEstado}

                        </td>
                    </tr>
                `;
      });

      tbody.innerHTML = html;
    } else {
      tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center text-muted">
                        No hay productos registrados
                    </td>
                </tr>
            `;
    }
  } catch (error) {
    console.error("Error cargando productos:", error);
  }
}

function showProductoModal() {
  document.getElementById("productoModalTitle").textContent = "Nuevo Producto";
  document.getElementById("productoForm").reset();
  document.getElementById("productoId").value = "";
  document.getElementById("productoStock").disabled = false;
  new bootstrap.Modal(document.getElementById("productoModal")).show();
}

function editProducto(producto) {
  document.getElementById("productoModalTitle").textContent = "Editar Producto";
  document.getElementById("productoId").value = producto.id;
  document.getElementById("productoCodigo").value = producto.codigo;
  document.getElementById("productoNombre").value = producto.nombre;
  document.getElementById("productoDescripcion").value =
    producto.descripcion || "";
  document.getElementById("productoPrecioCompra").value =
    producto.precio_compra;
  document.getElementById("productoPrecioVenta").value = producto.precio_venta;
  document.getElementById("productoStockMinimo").value = producto.stock_minimo;
  document.getElementById("productoStock").value = producto.stock;
  document.getElementById("productoStock").disabled = true;

  new bootstrap.Modal(document.getElementById("productoModal")).show();
}

async function saveProducto() {
  const id = document.getElementById("productoId").value;

  const data = {
    codigo: document.getElementById("productoCodigo").value,
    nombre: document.getElementById("productoNombre").value,
    descripcion: document.getElementById("productoDescripcion").value,
    precio_compra: document.getElementById("productoPrecioCompra").value,
    precio_venta: document.getElementById("productoPrecioVenta").value,
    stock_minimo: document.getElementById("productoStockMinimo").value,
  };

  if (id) {
    data.id = id;
  } else {
    data.stock = document.getElementById("productoStock").value;
  }

  try {
    const action = id ? "editar" : "nuevo";
    const result = await apiPost(`productos/${action}`, data);

    if (result.success) {
      Swal.fire({
        icon: "success",
        title: "Éxito",
        text: result.message,
        timer: 1500,
      });

      bootstrap.Modal.getInstance(
        document.getElementById("productoModal"),
      ).hide();

      loadProductosTable();
    } else {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: result.message,
      });
    }
  } catch (error) {
    console.error("Error:", error);

    Swal.fire({
      icon: "error",
      title: "Error",
      text: "Error al guardar el producto",
    });
  }
}

async function toggleProductoEstado(id, nuevoEstado) {

    const texto = nuevoEstado ? 'activar' : 'desactivar';

    const confirm = await Swal.fire({
        title: `¿Deseas ${texto} este producto?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: `Sí, ${texto}`,
        cancelButtonText: 'Cancelar'
    });

    if (!confirm.isConfirmed) return;

    try {

        const data = await apiPost('productos/estatus', {
            id: id,
            activo: nuevoEstado
        });

        if (data.success) {

            Swal.fire({
                icon: 'success',
                title: 'Actualizado',
                text: data.message,
                timer: 1200
            });

            loadProductosTable();

        } else {
            Swal.fire('Error', data.message, 'error');
        }

    } catch (error) {
        console.error(error);
        Swal.fire('Error', 'No se pudo actualizar el estado', 'error');
    }
}


function showStockModal(producto) {
  document.getElementById("stockProductoId").value = producto.id;
  document.getElementById("stockProductoNombre").textContent = producto.nombre;
  document.getElementById("stockActual").textContent = producto.stock;
  document.getElementById("stockCantidad").value = "1";
  document.getElementById("stockMotivo").value = "";
  new bootstrap.Modal(document.getElementById("stockModal")).show();
}

async function ajustarStock() {
  const data = {
    producto_id: document.getElementById("stockProductoId").value,
    tipo: document.getElementById("stockTipo").value,
    cantidad: document.getElementById("stockCantidad").value,
    motivo: document.getElementById("stockMotivo").value,
  };

  try {
    const response = await apiPost("inventario/registrar", data);

    if (response.success) {
      Swal.fire({
        icon: "success",
        title: "Éxito",
        text: response.message,
        timer: 1500,
      });
      bootstrap.Modal.getInstance(document.getElementById("stockModal")).hide();
      loadProductosTable();
    } else {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: response.message,
      });
    }
  } catch (error) {
    console.error("Error:", error);
  }
}
