// ========== MÓDULO DE INVENTARIO (Simplificado y Exportaciones Corregidas) ==========

let datosInventarioActuales = [];

async function loadInventario() {
  const hoy = new Date().toISOString().split("T")[0];
  const hace30Dias = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  document.getElementById("pageContent").innerHTML = `
    <div class="fade-in">
        <div class="d-flex justify-content-between align-items-center mb-4">
            <h2><i class="bi bi-clipboard-data"></i> Inventario</h2>
            <button class="btn btn-primary" onclick="showMovimientoInventarioModal()"><i class="bi bi-plus-circle"></i> Registrar Movimiento</button>
        </div>
        
        <div class="card mb-3"><div class="card-body">
            <div class="row g-2 align-items-end">
                <div class="col-md-3"><label class="form-label">Desde</label><input type="date" class="form-control" id="invFechaInicio" value="${hace30Dias}"></div>
                <div class="col-md-3"><label class="form-label">Hasta</label><input type="date" class="form-control" id="invFechaFin" value="${hoy}"></div>
                <div class="col-md-3"><label class="form-label">Estado</label>
                    <select class="form-select" id="invFiltroEstado" onchange="renderTablaInventario()">
                        <option value="Todos">Todos</option><option value="Agotado">Agotados</option><option value="Bajo">Stock Bajo</option><option value="Normal">Normal</option>
                    </select>
                </div>
                <div class="col-md-3"><button class="btn btn-primary w-100" onclick="loadReporteInventario()"><i class="bi bi-search"></i> Consultar</button></div>
            </div>
        </div></div>

        <div class="card">
            <div class="card-header bg-white d-flex justify-content-between align-items-center">
                <div class="input-group w-50">
                    <span class="input-group-text"><i class="bi bi-search"></i></span>
                    <input type="text" id="searchInv" class="form-control" placeholder="Buscar producto..." onkeyup="renderTablaInventario()">
                </div>
                <div>
                    <button class="btn btn-outline-success btn-sm" onclick="exportarInvExcel()"><i class="bi bi-file-earmark-excel"></i> Excel</button>
                    <button class="btn btn-outline-danger btn-sm" onclick="exportarInvPDF()"><i class="bi bi-file-earmark-pdf"></i> PDF</button>
                </div>
            </div>
            <div class="card-body p-0">
                <div class="table-responsive">
                    <table class="table table-hover mb-0">
                        <thead class="table-light">
                            <tr><th>Código</th><th>Producto</th><th>Stock</th><th>Valor</th><th>Vendidos</th><th>Ganancia</th><th>Estado</th><th>Acciones</th></tr>
                        </thead>
                        <tbody id="reporteInventarioBody"></tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>

    <!-- Modales -->
    <div class="modal fade" id="movimientoModal" tabindex="-1"><div class="modal-dialog"><div class="modal-content">
        <div class="modal-header"><h5>Registrar Movimiento</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
        <div class="modal-body"><form id="movimientoForm">
            <div class="mb-3"><label class="form-label">Buscar Producto</label>
                <input type="text" class="form-control" id="searchProductInv" placeholder="Nombre o código...">
                <div id="searchResultsInv" class="search-results" style="display: none;"></div>
                <input type="hidden" id="movProductoId" required>
                <div id="selectedProductInfo" class="mt-2"></div>
            </div>
            <div class="row">
                <div class="col-6 mb-3"><label class="form-label">Tipo</label><select class="form-select" id="movTipo"><option value="entrada">Entrada</option><option value="salida">Salida</option></select></div>
                <div class="col-6 mb-3"><label class="form-label">Cantidad</label><input type="number" class="form-control" id="movCantidad" min="1"></div>
            </div>
            <div class="mb-3"><label class="form-label">Motivo</label><input type="text" class="form-control" id="movMotivo" placeholder="Ej: Compra, Ajuste"></div>
        </form></div>
        <div class="modal-footer"><button type="button" class="btn btn-primary" onclick="guardarMovimiento()">Guardar</button></div>
    </div></div></div>

    <div class="modal fade" id="historialModal" tabindex="-1"><div class="modal-dialog modal-lg"><div class="modal-content">
        <div class="modal-header"><h5>Historial de Movimientos</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
        <div class="modal-body">
            <div class="table-responsive"><table class="table table-sm">
                <thead><tr><th>Fecha</th><th>Tipo</th><th>Cant.</th><th>Motivo</th><th>Usuario</th></tr></thead>
                <tbody id="historialTableBody"></tbody>
            </table></div>
        </div>
    </div></div></div>`;

  initBuscadorInventario();
  await loadReporteInventario();
}

async function loadReporteInventario() {
  const fechaInicio = document.getElementById("invFechaInicio").value;
  const fechaFin = document.getElementById("invFechaFin").value;
  const res = await apiPost("inventario/reporte", { fechaInicio, fechaFin }, { showLoader: false });
  if (res.success) {
    datosInventarioActuales = res.data;
    renderTablaInventario();
  }
}

function getDatosFiltrados() {
  const filtroEstado = document.getElementById("invFiltroEstado").value;
  const search = document.getElementById("searchInv").value.toLowerCase();

  return datosInventarioActuales.filter((item) => {
    const matchEstado = filtroEstado === "Todos" || item.estado === filtroEstado;
    const matchSearch = item.nombre.toLowerCase().includes(search) || item.codigo.toLowerCase().includes(search);
    return matchEstado && matchSearch;
  });
}

function renderTablaInventario() {
  const datosFiltrados = getDatosFiltrados();
  fillTable("reporteInventarioBody", datosFiltrados, [
    { field: "codigo" },
    { render: (p) => `<strong>${p.nombre}</strong>` },
    { field: "stock" },
    { render: (p) => formatCurrency(p.valor_stock_costo) },
    { field: "cantidad_vendida" },
    { render: (p) => `<span class="text-success">${formatCurrency(p.ganancia)}</span>` },
    { render: (p) => `<span class="badge bg-${p.estado === 'Agotado' ? 'danger' : (p.estado === 'Bajo' ? 'warning text-dark' : 'success')}">${p.estado}</span>` },
    { render: (p) => `<button class="btn btn-sm btn-outline-info" onclick="verHistorial(${p.id}, '${p.nombre}')"><i class="bi bi-clock-history"></i></button>` }
  ]);
}

async function showMovimientoInventarioModal() {
  document.getElementById("movimientoForm").reset();
  document.getElementById("movProductoId").value = "";
  document.getElementById("selectedProductInfo").innerHTML = "";
  new bootstrap.Modal(document.getElementById("movimientoModal")).show();
}

async function guardarMovimiento() {
  const data = {
    producto_id: document.getElementById("movProductoId").value,
    tipo: document.getElementById("movTipo").value,
    cantidad: document.getElementById("movCantidad").value,
    motivo: document.getElementById("movMotivo").value,
  };
  if (!data.producto_id || !data.cantidad) return notify("Error", "Complete los campos", "error");
  await apiPost("inventario/registrar", data, { successMsg: "Movimiento registrado" });
  bootstrap.Modal.getInstance(document.getElementById("movimientoModal")).hide();
  await loadReporteInventario();
}

async function verHistorial(productoId, nombre) {
  const res = await apiPost("inventario/listar", { 
    producto_id: productoId,
    fechaInicio: document.getElementById("invFechaInicio").value,
    fechaFin: document.getElementById("invFechaFin").value
  });
  if (res.success) {
    fillTable("historialTableBody", res.data, [
      { render: (m) => `<small>${new Date(m.fecha_movimiento).toLocaleString()}</small>` },
      { render: (m) => `<span class="badge bg-${m.tipo === "entrada" ? "success" : "danger"}">${m.tipo.toUpperCase()}</span>` },
      { field: "cantidad" },
      { field: "motivo" },
      { field: "usuario_nombre" }
    ]);
    new bootstrap.Modal(document.getElementById("historialModal")).show();
  }
}

function initBuscadorInventario() {
  const input = document.getElementById("searchProductInv");
  const results = document.getElementById("searchResultsInv");
  let timeout;
  input.addEventListener("input", () => {
    clearTimeout(timeout);
    const q = input.value.trim();
    if (q.length < 2) { results.style.display = "none"; return; }
    timeout = setTimeout(async () => {
      const res = await apiPost("productos/buscar", { q }, { showLoader: false });
      if (res.success && res.data.length > 0) {
        results.innerHTML = res.data.map(p => `<div class="search-result-item p-2 border-bottom" onclick="selectProductInv(${p.id}, '${p.nombre}', ${p.stock})"><strong>${p.nombre}</strong> <small>(${p.codigo})</small><br><small class="text-muted">Stock: ${p.stock}</small></div>`).join("");
        results.style.display = "block";
      }
    }, 300);
  });
}

function selectProductInv(id, nombre, stock) {
  document.getElementById("movProductoId").value = id;
  document.getElementById("selectedProductInfo").innerHTML = `<span class="badge bg-info text-dark">Seleccionado: ${nombre} (Stock: ${stock})</span>`;
  document.getElementById("searchResultsInv").style.display = "none";
  document.getElementById("searchProductInv").value = "";
}

// =========================
// EXPORTACIONES CORREGIDAS
// =========================

async function exportarInvExcel() {
  // CORRECCIÓN: confirmAction devuelve booleano, no objeto
  const conDetalles = await confirmAction("Exportar Excel", "¿Deseas incluir el historial de movimientos de cada producto?", "Sí, detallado");
  
  const fechaInicio = document.getElementById("invFechaInicio").value;
  const fechaFin = document.getElementById("invFechaFin").value;
  
  let datos = getDatosFiltrados();
  if (conDetalles) {
    datos = await obtenerDatosDetallados(datos, fechaInicio, fechaFin);
  }

  const wb = XLSX.utils.book_new();
  const rows = [["Código", "Producto", "Vendidos", "Stock Actual", "Ganancia", "Estado"]];

  datos.forEach(p => {
    rows.push([p.codigo, p.nombre, Number(p.cantidad_vendida), Number(p.stock), Number(p.ganancia), p.estado]);
    if (conDetalles && p.movimientos && p.movimientos.length > 0) {
      p.movimientos.forEach(m => {
        rows.push(["", "   ↳ " + formatDate(m.fecha_movimiento) + " | " + m.motivo, m.tipo === 'entrada' ? '+' + m.cantidad : '-' + m.cantidad, "", "", ""]);
      });
    }
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, "Inventario");
  XLSX.writeFile(wb, `Inventario_${fechaInicio}_${conDetalles ? 'Detallado' : 'Resumen'}.xlsx`);
}

async function exportarInvPDF() {
  // CORRECCIÓN: confirmAction devuelve booleano, no objeto
  const conDetalles = await confirmAction("Exportar PDF", "¿Deseas incluir el historial de movimientos en el documento?", "Sí, detallado");
  
  const fechaInicio = document.getElementById("invFechaInicio").value;
  const fechaFin = document.getElementById("invFechaFin").value;
  
  let datos = getDatosFiltrados();
  if (conDetalles) {
    datos = await obtenerDatosDetallados(datos, fechaInicio, fechaFin);
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.text("Reporte de Inventario", 105, 15, { align: "center" });
  doc.setFontSize(10);
  doc.text(`Periodo: ${fechaInicio} al ${fechaFin}`, 105, 22, { align: "center" });

  const body = [];
  datos.forEach(p => {
    body.push([p.codigo, p.nombre, p.cantidad_vendida, p.stock, p.estado]);
    if (conDetalles && p.movimientos && p.movimientos.length > 0) {
      p.movimientos.forEach(m => {
        body.push(["", { content: `↳ ${formatDate(m.fecha_movimiento)}: ${m.motivo}`, styles: { fontStyle: 'italic', textColor: [100, 100, 100] } }, "", m.tipo === 'entrada' ? '+'+m.cantidad : '-'+m.cantidad, ""]);
      });
    }
  });

  doc.autoTable({
    startY: 30,
    head: [['Código', 'Producto / Movimientos', 'Vendidos', 'Stock', 'Estado']],
    body: body,
    theme: conDetalles ? 'plain' : 'striped',
    headStyles: { fillColor: [41, 128, 185] }
  });

  doc.save(`Inventario_${fechaInicio}.pdf`);
}

async function obtenerDatosDetallados(datos, fechaInicio, fechaFin) {
  showLoading();
  try {
    const promesas = datos.map(p => 
      apiPost("inventario/listar", { producto_id: p.id, fechaInicio, fechaFin }, { showLoader: false })
      .then(res => ({ ...p, movimientos: res.data || [] }))
      .catch(() => ({ ...p, movimientos: [] }))
    );
    const resultados = await Promise.all(promesas);
    hideLoading();
    return resultados;
  } catch (e) {
    hideLoading();
    return datos;
  }
}
