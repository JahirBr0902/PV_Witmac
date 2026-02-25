let datosInventarioActuales = [];

async function loadInventario() {
    const content = document.getElementById('pageContent');
    const hoy = new Date().toISOString().split('T')[0];
    const hace30Dias = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    content.innerHTML = `
        <div class="fade-in">
            <div class="d-flex justify-content-between align-items-center mb-4">
                <h2><i class="bi bi-clipboard-data"></i> Reporte y Control de Inventario</h2>
                <button class="btn btn-primary" onclick="showMovimientoModal()">
                    <i class="bi bi-plus-circle"></i> Registrar Entrada / Ajuste
                </button>
            </div>
            
            <div class="card mb-3">
                <div class="card-body">
                    <div class="row align-items-end">
                        <div class="col-md-3 mb-3">
                            <label class="form-label">Desde</label>
                            <input type="date" class="form-control" id="invFechaInicio" value="${hace30Dias}">
                        </div>
                        <div class="col-md-3 mb-3">
                            <label class="form-label">Hasta</label>
                            <input type="date" class="form-control" id="invFechaFin" value="${hoy}">
                        </div>
                        <div class="col-md-3 mb-3">
                            <label class="form-label">Filtrar Estado</label>
                            <select class="form-select" id="invFiltroEstado" onchange="renderTablaInventario()">
                                <option value="Todos">Todos los productos</option>
                                <option value="Agotado">Agotados</option>
                                <option value="Bajo">Stock Bajo</option>
                                <option value="Normal">En Orden (Normal)</option>
                            </select>
                        </div>
                        <div class="col-md-3 mb-3">
                            <button class="btn btn-primary w-100" onclick="loadReporteInventario()">
                                <i class="bi bi-search"></i> Consultar
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-header bg-white d-flex justify-content-between align-items-center">
                    <div class="input-group w-25">
                        <span class="input-group-text"><i class="bi bi-search"></i></span>
                        <input type="text" id="searchInv" class="form-control" placeholder="Buscar..." onkeyup="renderTablaInventario()">
                    </div>
                    <div>
                        <button class="btn btn-success me-2" onclick="exportarInvExcel()">
                            <i class="bi bi-file-earmark-excel"></i> Excel
                        </button>
                        <button class="btn btn-danger" onclick="exportarInvPDF()">
                            <i class="bi bi-file-earmark-pdf"></i> PDF
                        </button>
                    </div>
                </div>
                <div class="card-body">
                    <div class="table-responsive">
                        <table class="table table-hover align-middle">
                            <thead class="table-light">
                                <tr>
                                    <th>Código</th>
                                    <th>Producto</th>
                                    <th>Stock Actual</th>
                                    <th>Valor Stock</th>
                                    <th>Vendidos</th>
                                    <th>Ganancia</th>
                                    <th>Estado</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody id="reporteInventarioBody"></tbody>
                            <tfoot class="table-light" id="reporteInventarioFooter"></tfoot>
                        </table>
                    </div>
                </div>
            </div>
        </div>

        <div class="modal fade" id="movimientoModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header bg-primary text-white">
                        <h5 class="modal-title">Registrar Entrada / Ajuste</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="movimientoForm">
                            <div class="mb-3">
                                <label class="form-label">Buscar Producto *</label>
                                <div class="product-search position-relative">
                                    <input type="text" class="form-control" id="searchProductInv" placeholder="Nombre o código...">
                                    <div id="searchResultsInv" class="search-results" style="display: none;"></div>
                                </div>
                                <input type="hidden" id="movProductoId" required>
                                <div id="selectedProductInfo" class="mt-2"></div>
                            </div>
                            <div class="row">
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">Tipo *</label>
                                    <select class="form-select" id="movTipo">
                                        <option value="entrada">Entrada (Sumar)</option>
                                        <option value="salida">Salida (Restar)</option>
                                    </select>
                                </div>
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">Cantidad *</label>
                                    <input type="number" class="form-control" id="movCantidad" min="1">
                                </div>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Motivo</label>
                                <input type="text" class="form-control" id="movMotivo" placeholder="Ej: Compra, Ajuste">
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-primary" onclick="guardarMovimiento()">Guardar</button>
                    </div>
                </div>
            </div>
        </div>

        <div class="modal fade" id="historialModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header bg-info text-white">
                        <h5 class="modal-title">Historial de Movimientos</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <table class="table table-sm">
                            <thead>
                                <tr>
                                    <th>Fecha</th>
                                    <th>Tipo</th>
                                    <th>Cant.</th>
                                    <th>Motivo</th>
                                    <th>Usuario</th>
                                </tr>
                            </thead>
                            <tbody id="historialTableBody"></tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    `;

    initBuscadorInventario();
    await loadReporteInventario();
}

async function loadReporteInventario() {
    const fechaInicio = document.getElementById('invFechaInicio').value;
    const fechaFin = document.getElementById('invFechaFin').value;
    
    document.getElementById('reporteInventarioBody').innerHTML = '<tr><td colspan="7" class="text-center">Calculando datos...</td></tr>';
    
    try {
        const response = await apiPost('inventario/reporte', { fechaInicio, fechaFin });
        if(response.success) {
            datosInventarioActuales = response.data;
            renderTablaInventario();
        }
    } catch (error) {
        console.error(error);
        Swal.fire('Error', 'No se pudo cargar el reporte', 'error');
    }
}

function renderTablaInventario() {
    const tbody = document.getElementById('reporteInventarioBody');
    const tfoot = document.getElementById('reporteInventarioFooter');
    
    const filtroEstado = document.getElementById('invFiltroEstado').value;
    const search = document.getElementById('searchInv').value.toLowerCase();
    
    let html = '';
    let totalValorStock = 0;
    let totalVendidos = 0;
    let totalGanancia = 0;
    
    let currentGrupo = '';

    const datosFiltrados = datosInventarioActuales.filter(item => {
        const matchEstado = filtroEstado === 'Todos' || item.estado === filtroEstado;
        const matchSearch = item.nombre.toLowerCase().includes(search) || item.codigo.toLowerCase().includes(search);
        return matchEstado && matchSearch;
    });

    if (datosFiltrados.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No se encontraron productos con estos filtros.</td></tr>';
        tfoot.innerHTML = '';
        return;
    }

    datosFiltrados.forEach(item => {
        // Generar separadores visuales por estado
        if (currentGrupo !== item.estado) {
            currentGrupo = item.estado;
            let bgClass = item.estado === 'Agotado' ? 'bg-danger text-white' : 
                          (item.estado === 'Bajo' ? 'bg-warning text-dark' : 'bg-success text-white');
            html += `<tr class="${bgClass} opacity-75"><td colspan="7" class="fw-bold py-1"><i class="bi bi-tag-fill"></i> SECCIÓN: ${item.estado.toUpperCase()}</td></tr>`;
        }

        const badgeClass = item.estado === 'Agotado' ? 'danger' : (item.estado === 'Bajo' ? 'warning text-dark' : 'success');
        
        // Sumatorias
        totalValorStock += parseFloat(item.valor_stock_costo);
        totalVendidos += parseInt(item.cantidad_vendida);
        totalGanancia += parseFloat(item.ganancia);

        html += `
        <tr>
            <td><small>${item.codigo}</small></td>
            <td><strong>${item.nombre}</strong></td>
            <td>${item.stock}</td>
            <td>$${parseFloat(item.valor_stock_costo).toFixed(2)}</td>
            <td class="text-primary">${item.cantidad_vendida}</td>
            <td class="text-success">$${parseFloat(item.ganancia).toFixed(2)}</td>
            <td><span class="badge bg-${badgeClass}">${item.estado}</span></td>
            <td>
                <button class="btn btn-sm btn-outline-info" onclick="verHistorial(${item.id}, '${item.nombre}')">
                    <i class="bi bi-clock-history"></i>
                </button>
            </td>
        </tr>
    `;
});

    tbody.innerHTML = html;
    tfoot.innerHTML = `
        <tr>
            <td colspan="3" class="text-end fw-bold">TOTALES GLOBALES FILTRADOS:</td>
            <td class="fw-bold">$${totalValorStock.toFixed(2)}</td>
            <td class="text-primary fw-bold">${totalVendidos}</td>
            <td class="text-success fw-bold">$${totalGanancia.toFixed(2)}</td>
            <td></td>
        </tr>
    `;
}

// Modal de Ajustes
async function showMovimientoModal() {
    document.getElementById('movimientoForm').reset();
    try {
        const select = document.getElementById('movProductoId');
        select.innerHTML = '<option value="">Cargando productos...</option>';
        const productos = await apiPost('productos/listar');
        select.innerHTML = '<option value="">Seleccione un producto...</option>';
        productos.forEach(p => {
            if (p.activo) select.innerHTML += `<option value="${p.id}">${p.codigo} - ${p.nombre} (Stock: ${p.stock})</option>`;
        });
    } catch (error) { console.error(error); }
    new bootstrap.Modal(document.getElementById('movimientoModal')).show();
}

async function guardarMovimiento() {
    const data = {
        producto_id: document.getElementById('movProductoId').value,
        tipo: document.getElementById('movTipo').value,
        cantidad: document.getElementById('movCantidad').value,
        motivo: document.getElementById('movMotivo').value
    };
    if (!data.producto_id || !data.cantidad || data.cantidad <= 0) return Swal.fire('Error', 'Complete los campos obligatorios', 'error');

    try {
        const result = await apiPost('inventario/registrar', data);
        if (result.success) {
            Swal.fire('¡Éxito!', 'Movimiento registrado', 'success');
            bootstrap.Modal.getInstance(document.getElementById('movimientoModal')).hide();
            await loadReporteInventario();
        }
    } catch (error) { Swal.fire('Error', error.message, 'error'); }
}

/* =========================================
   EXPORTACIONES (Excel y PDF al estilo ventas.js)
========================================= */
async function exportarInvExcel() {
    const { isConfirmed } = await Swal.fire({
        title: 'Exportar Inventario',
        text: "¿Deseas incluir el desglose de movimientos por producto?",
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Sí, detallado',
        cancelButtonText: 'No, solo resumen',
        confirmButtonColor: '#10b981'
    });

    const fechaInicio = document.getElementById('invFechaInicio').value;
    const fechaFin = document.getElementById('invFechaFin').value;
    
    // Obtenemos los datos que están actualmente en la tabla (respetando filtros)
    let datosAExportar = [...datosInventarioActuales]; 

    if (isConfirmed) {
        datosAExportar = await obtenerDatosDetallados(datosAExportar, fechaInicio, fechaFin);
    }

    const wb = XLSX.utils.book_new();
    const ws = {};
    let row = 0;

    const addCell = (r, c, v, s = {}) => {
        const ref = XLSX.utils.encode_cell({ r, c });
        ws[ref] = { v, t: typeof v === 'number' ? 'n' : 's', s };
        if (s.numFmt) ws[ref].z = s.numFmt;
    };

    addCell(row, 0, "REPORTE DE INVENTARIO " + (isConfirmed ? "DETALLADO" : "RESUMIDO"), { font: { bold: true, sz: 14 } });
    row += 2;

    const headers = ["Código", "Producto", "Stock", "Valor Stock", "Vendidos", "Ganancia", "Estado"];
    headers.forEach((h, i) => addCell(row, i, h, { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "4472C4" } } }));
    row++;

    datosAExportar.forEach(item => {
        addCell(row, 0, item.codigo);
        addCell(row, 1, item.nombre, { font: { bold: true } });
        addCell(row, 2, parseInt(item.stock));
        addCell(row, 3, parseFloat(item.valor_stock_costo), { numFmt: '"$"#,##0.00' });
        addCell(row, 4, parseInt(item.cantidad_vendida));
        addCell(row, 5, parseFloat(item.ganancia), { numFmt: '"$"#,##0.00' });
        addCell(row, 6, item.estado);
        row++;

        if (isConfirmed && item.movimientos && item.movimientos.length > 0) {
            item.movimientos.forEach(m => {
                addCell(row, 1, "   ↳ " + m.fecha_movimiento + " | " + m.motivo, { font: { italic: true, color: { rgb: "666666" } } });
                addCell(row, 2, m.tipo === 'entrada' ? "+" + m.cantidad : "-" + m.cantidad);
                row++;
            });
        }
    });

    ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: row, c: 6 } });
    XLSX.utils.book_append_sheet(wb, ws, "Inventario");
    XLSX.writeFile(wb, `Inventario_${new Date().getTime()}.xlsx`);
}

async function exportarInvPDF() {
    const { isConfirmed } = await Swal.fire({
        title: 'Exportar PDF',
        text: "¿Deseas incluir los movimientos en el documento?",
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Sí, detallado',
        cancelButtonText: 'No, resumen'
    });

    const fechaInicio = document.getElementById('invFechaInicio').value;
    const fechaFin = document.getElementById('invFechaFin').value;
    
    let datosAExportar = [...datosInventarioActuales];

    if (isConfirmed) {
        datosAExportar = await obtenerDatosDetallados(datosAExportar, fechaInicio, fechaFin);
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    doc.setFontSize(14);
    doc.text("REPORTE DE INVENTARIO " + (isConfirmed ? "DETALLADO" : ""), 105, 15, { align: "center" });

    const tableBody = [];
    datosAExportar.forEach(item => {
        tableBody.push([
            item.codigo,
            item.nombre,
            item.stock,
            `$${parseFloat(item.valor_stock_costo).toFixed(2)}`,
            item.estado
        ]);

        if (isConfirmed && item.movimientos) {
            item.movimientos.forEach(m => {
                tableBody.push([
                    "",
                    { content: `  > ${m.fecha_movimiento} - ${m.motivo}`, styles: { textColor: [100, 100, 100], fontSize: 7 } },
                    m.tipo === 'entrada' ? `+${m.cantidad}` : `-${m.cantidad}`,
                    "",
                    ""
                ]);
            });
        }
    });

    doc.autoTable({
        startY: 25,
        head: [['Código', 'Producto / Movimientos', 'Stock', 'Valor', 'Estado']],
        body: tableBody,
        theme: 'striped',
        headStyles: { fillColor: [41, 128, 185] }
    });

    doc.save(`Inventario_${fechaInicio}.pdf`);
}
async function verHistorial(productoId, nombre) {
    const tbody = document.getElementById('historialTableBody');
    // Obtenemos las fechas actuales de los filtros principales
    const fechaInicio = document.getElementById('invFechaInicio').value;
    const fechaFin = document.getElementById('invFechaFin').value;
    
    tbody.innerHTML = '<tr><td colspan="5" class="text-center">Cargando movimientos del periodo...</td></tr>';
    
    // Actualizar el título del modal para mostrar el rango consultado
    const modalTitle = document.querySelector('#historialModal .modal-title');
    modalTitle.innerHTML = `<i class="bi bi-clock-history"></i> Historial: ${nombre} <br><small style="font-size: 0.7em;">(${fechaInicio} a ${fechaFin})</small>`;

    new bootstrap.Modal(document.getElementById('historialModal')).show();

    try {
        // Ahora enviamos producto_id junto con el rango de fechas
        const data = await apiPost('inventario/listar', { 
            producto_id: productoId,
            fechaInicio: fechaInicio,
            fechaFin: fechaFin
        });
        
        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No hay movimientos en este rango de fechas.</td></tr>';
            return;
        }

        tbody.innerHTML = data.map(m => `
            <tr>
                <td><small>${new Date(m.fecha_movimiento).toLocaleString()}</small></td>
                <td>
                    <span class="badge bg-${m.tipo === 'entrada' ? 'success' : 'danger'}">
                        ${m.tipo.toUpperCase()}
                    </span>
                </td>
                <td class="fw-bold">${m.cantidad}</td>
                <td><small>${m.motivo}</small></td>
                <td><small>${m.usuario_nombre}</small></td>
            </tr>
        `).join('');
        
    } catch (e) { 
        console.error(e);
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Error al consultar el historial.</td></tr>';
    }
}

function initBuscadorInventario() {
    const input = document.getElementById('searchProductInv');
    const results = document.getElementById('searchResultsInv');
    let timeout;

    input.addEventListener('input', () => {
        clearTimeout(timeout);
        const q = input.value.trim();
        if (q.length < 2) { results.style.display = 'none'; return; }

        timeout = setTimeout(async () => {
            try {
                // Reutilizamos el endpoint de búsqueda que ya tienes
                const res = await apiPost('productos/buscar', { q });
                if (res.success && res.data.length > 0) {
                    results.innerHTML = res.data.map(p => `
                        <div class="search-result-item p-2 border-bottom" 
                             onclick="selectProductInv(${p.id}, '${p.nombre}', ${p.stock})">
                            <strong>${p.nombre}</strong> <small>(${p.codigo})</small><br>
                            <small class="text-muted">Stock: ${p.stock}</small>
                        </div>
                    `).join('');
                    results.style.display = 'block';
                }
            } catch (e) { console.error(e); }
        }, 300);
    });
}

function selectProductInv(id, nombre, stock) {
    document.getElementById('movProductoId').value = id;
    document.getElementById('selectedProductInfo').innerHTML = 
        `<span class="badge bg-info text-dark">Seleccionado: ${nombre} (Stock: ${stock})</span>`;
    document.getElementById('searchResultsInv').style.display = 'none';
    document.getElementById('searchProductInv').value = '';
}

function seleccionarProductoInv(id, nombre, codigo, stock) {
    document.getElementById('movProductoId').value = id;
    document.getElementById('selectedProductBadge').innerHTML = `
        <div class="alert alert-secondary py-1 px-2 mb-0 d-inline-block">
            <i class="bi bi-box"></i> ${nombre} (${codigo}) - <strong>Stock: ${stock}</strong>
        </div>
    `;
    document.getElementById('searchResultsInv').style.display = 'none';
    document.getElementById('searchProductInv').value = '';
}


async function obtenerDatosDetallados(datosFiltrados, fechaInicio, fechaFin) {
    showLoading(); // Muestra el spinner de carga
    
    try {
        // Creamos una lista de promesas para pedir los movimientos de todos los productos a la vez
        const promesas = datosFiltrados.map(item => 
            apiPost('inventario/listar', { 
                producto_id: item.id,
                fechaInicio: fechaInicio,
                fechaFin: fechaFin
            }).then(movimientos => ({ ...item, movimientos }))
        );

        const resultados = await Promise.all(promesas);
        hideLoading();
        return resultados;
    } catch (e) {
        hideLoading();
        console.error("Error al obtener detalles:", e);
        Swal.fire('Error', 'No se pudieron obtener los movimientos detallados', 'error');
        return datosFiltrados;
    }
}