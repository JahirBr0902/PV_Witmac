// ========== MÓDULO DE PRODUCTOS (Simplificado) ==========

async function loadProductos() {
  document.getElementById("pageContent").innerHTML = `
    <div class="fade-in">
        <div class="d-flex justify-content-between align-items-center mb-4">
            <h2><i class="bi bi-box"></i> Productos</h2>
            <div class="d-flex gap-2">
                <div class="input-group">
                    <span class="input-group-text"><i class="bi bi-search"></i></span>
                    <input type="text" id="searchProductosInput" class="form-control" placeholder="Buscar..." onkeyup="filtrarProductos()">
                </div>
                <button class="btn btn-primary" onclick="showProductoModal()"><i class="bi bi-plus-circle"></i> Nuevo</button>
            </div>
        </div>
        <div class="card"><div class="card-body"><div class="table-responsive">
            <table class="table table-hover" id="productosTable">
                <thead><tr><th>ID</th><th>Nombre</th><th>Compra</th><th>Venta</th><th>Stock</th><th>Acciones</th></tr></thead>
                <tbody id="productosTableBody"></tbody>
            </table>
        </div></div></div>
    </div>
    
    <!-- Modal Producto -->
    <div class="modal fade" id="productoModal" tabindex="-1"><div class="modal-dialog"><div class="modal-content">
        <div class="modal-header"><h5 class="modal-title" id="productoModalTitle">Producto</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
        <div class="modal-body"><form id="productoForm">
            <input type="hidden" id="productoId">
            <!-- <div class="mb-2"><label class="form-label">Código *</label><input type="text" class="form-control" id="productoCodigo" required></div> -->
            <div class="mb-2">
                <label class="form-label">Código *</label>
                <div class="input-group">
                    <input type="text" class="form-control" id="productoCodigo" required>
                    <button type="button" class="btn btn-outline-secondary" onclick="toggleScanner()">
                        <i class="bi bi-camera"></i> Scan
                    </button>
                </div>
                <div id="barcode-reader" style="width: 100%; margin-top: 10px; display: none;"></div>
            </div>
            <div class="mb-2"><label class="form-label">Nombre *</label><input type="text" class="form-control" id="productoNombre" required></div>
            <div class="mb-2"><label class="form-label">Descripción</label><textarea class="form-control" id="productoDescripcion" rows="2"></textarea></div>
            <div class="row">
                <div class="col-6 mb-2"><label class="form-label">P. Compra</label><input type="number" class="form-control" id="productoPrecioCompra" step="0.01"></div>
                <div class="col-6 mb-2"><label class="form-label">P. Venta</label><input type="number" class="form-control" id="productoPrecioVenta" step="0.01"></div>
            </div>
            <div class="row">
                <div class="col-6 mb-2"><label class="form-label">Stock</label><input type="number" class="form-control" id="productoStock"></div>
                <div class="col-6 mb-2"><label class="form-label">Mínimo</label><input type="number" class="form-control" id="productoStockMinimo" value="5"></div>
            </div>
        </form></div>
        <div class="modal-footer"><button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button><button type="button" class="btn btn-primary" onclick="saveProducto()">Guardar</button></div>
    </div></div></div>

    <!-- Modal Stock -->
    <div class="modal fade" id="stockModal" tabindex="-1"><div class="modal-dialog"><div class="modal-content">
        <div class="modal-header"><h5>Ajustar Stock</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
        <div class="modal-body">
            <input type="hidden" id="stockProductoId">
            <p><strong>Producto:</strong> <span id="stockProductoNombre"></span></p>
            <div class="mb-3"><label class="form-label">Tipo</label><select class="form-select" id="stockTipo"><option value="entrada">Entrada</option><option value="salida">Salida</option></select></div>
            <div class="mb-3"><label class="form-label">Cantidad</label><input type="number" class="form-control" id="stockCantidad" value="1"></div>
            <div class="mb-3"><label class="form-label">Motivo</label><input type="text" class="form-control" id="stockMotivo" placeholder="Ej: Ajuste"></div>
        </div>
        <div class="modal-footer"><button type="button" class="btn btn-primary" onclick="ajustarStock()">Guardar</button></div>
    </div></div></div>`;

  await loadProductosTable();
}

async function loadProductosTable() {
  const data = await apiPost("productos/listar", {}, { showLoader: false });
  fillTable("productosTableBody", data, [
    { field: "id" },
    { field: "nombre" },
    { render: (p) => formatCurrency(p.precio_compra) },
    { render: (p) => formatCurrency(p.precio_venta) },
    { render: (p) => `<span class="badge bg-${p.stock <= p.stock_minimo ? "danger" : "success"}">${p.stock}</span>` },
    {
      render: (p) => `
        <button class="btn btn-sm btn-primary" onclick='showStockModal(${JSON.stringify(p)})'><i class="bi bi-arrow-left-right"></i></button>
        <button class="btn btn-sm btn-warning" onclick='editProducto(${JSON.stringify(p)})'><i class="bi bi-pencil"></i></button>
        <button class="btn btn-sm btn-${p.activo ? "success" : "danger"}" onclick="toggleProductoEstado(${p.id}, ${!p.activo})"><i class="bi bi-${p.activo ? "check" : "x"}-circle"></i></button>`
    }
  ]);
}

function showProductoModal() {
  document.getElementById("productoForm").reset();
  document.getElementById("productoId").value = "";
  document.getElementById("productoStock").disabled = false;
  new bootstrap.Modal(document.getElementById("productoModal")).show();
}

function editProducto(p) {
  showProductoModal();
  document.getElementById("productoId").value = p.id;
  document.getElementById("productoCodigo").value = p.codigo;
  document.getElementById("productoNombre").value = p.nombre;
  document.getElementById("productoDescripcion").value = p.descripcion || "";
  document.getElementById("productoPrecioCompra").value = p.precio_compra;
  document.getElementById("productoPrecioVenta").value = p.precio_venta;
  document.getElementById("productoStockMinimo").value = p.stock_minimo;
  document.getElementById("productoStock").value = p.stock;
  document.getElementById("productoStock").disabled = true;
}

async function saveProducto() {
  const id = document.getElementById("productoId").value;
  const data = {
    id: id || undefined,
    codigo: document.getElementById("productoCodigo").value,
    nombre: document.getElementById("productoNombre").value,
    descripcion: document.getElementById("productoDescripcion").value,
    precio_compra: document.getElementById("productoPrecioCompra").value,
    precio_venta: document.getElementById("productoPrecioVenta").value,
    stock_minimo: document.getElementById("productoStockMinimo").value,
    stock: id ? undefined : document.getElementById("productoStock").value
  };

  await apiPost(`productos/${id ? "editar" : "nuevo"}`, data, { successMsg: "Producto guardado" });
  bootstrap.Modal.getInstance(document.getElementById("productoModal")).hide();
  loadProductosTable();
}

function showStockModal(p) {
  document.getElementById("stockProductoId").value = p.id;
  document.getElementById("stockProductoNombre").textContent = p.nombre;
  new bootstrap.Modal(document.getElementById("stockModal")).show();
}

async function ajustarStock() {
  const data = {
    producto_id: document.getElementById("stockProductoId").value,
    tipo: document.getElementById("stockTipo").value,
    cantidad: document.getElementById("stockCantidad").value,
    motivo: document.getElementById("stockMotivo").value
  };

  await apiPost("inventario/registrar", data, { successMsg: "Stock ajustado" });
  bootstrap.Modal.getInstance(document.getElementById("stockModal")).hide();
  loadProductosTable();
}

async function toggleProductoEstado(id, nuevoEstado) {
  if (!await confirmAction(`¿Deseas ${nuevoEstado ? "activar" : "desactivar"} este producto?`)) return;
  await apiPost("productos/estatus", { id, activo: nuevoEstado }, { successMsg: "Estado actualizado" });
  loadProductosTable();
}

function filtrarProductos() {
  const q = document.getElementById('searchProductosInput').value.toLowerCase();
  document.querySelectorAll('#productosTableBody tr').forEach(row => {
    row.style.display = row.innerText.toLowerCase().includes(q) ? '' : 'none';
  });
}

// ========== ESCÁNER DE CÓDIGO DE BARRAS ==========
let html5QrCode;

async function toggleScanner() {
    const readerDiv = document.getElementById('barcode-reader');
    
    if (html5QrCode && html5QrCode.isScanning) {
        await stopScanner();
        return;
    }

    readerDiv.style.display = 'block';
    html5QrCode = new Html5Qrcode("barcode-reader");
    
    const config = { fps: 10, qrbox: { width: 250, height: 150 } };

    try {
        await html5QrCode.start(
            { facingMode: "environment" }, 
            config,
            (decodedText) => {
                document.getElementById('productoCodigo').value = decodedText;
                stopScanner();
                // Opcional: Sonido de éxito
                const audio = new Audio('https://www.soundjay.com/button/beep-07.wav');
                audio.play();
            },
            (errorMessage) => {
                // Errores de escaneo silenciosos
            }
        );
    } catch (err) {
        console.error("Error al iniciar cámara:", err);
        alert("No se pudo acceder a la cámara.");
        readerDiv.style.display = 'none';
    }
}

async function stopScanner() {
    if (html5QrCode) {
        try {
            if (html5QrCode.isScanning) {
                await html5QrCode.stop();
            }
            await html5QrCode.clear();
        } catch (err) {
            console.error("Error al detener escáner:", err);
        }
    }
    document.getElementById('barcode-reader').style.display = 'none';
}

// Detener cámara cuando se cierra el modal
document.addEventListener('DOMContentLoaded', () => {
    const modalElement = document.getElementById('productoModal');
    if (modalElement) {
        modalElement.addEventListener('hidden.bs.modal', () => {
            stopScanner();
        });
    }
});
