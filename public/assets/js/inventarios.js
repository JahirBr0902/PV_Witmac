// ========== MÓDULO DE INVENTARIO (REPORTE FINANCIERO Y OPERATIVO) ==========

let datosInventarioActuales = [];

async function loadInventario() {
    const content = document.getElementById('pageContent');
    
    // Fechas por defecto: Últimos 30 días
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
                        <input type="text" id="searchInv" class="form-control" placeholder="Buscar por código o nombre..." onkeyup="renderTablaInventario()">
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
                                    <th>Vendidos (Rango)</th>
                                    <th>Ganancia (Rango)</th>
                                    <th>Estado</th>
                                </tr>
                            </thead>
                            <tbody id="reporteInventarioBody">
                                <tr><td colspan="7" class="text-center">Cargando reporte...</td></tr>
                            </tbody>
                            <tfoot class="table-light" id="reporteInventarioFooter">
                            </tfoot>
                        </table>
                    </div>
                </div>
            </div>
        </div>

        <div class="modal fade" id="movimientoModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header bg-primary text-white">
                        <h5 class="modal-title"><i class="bi bi-arrow-left-right"></i> Registrar Entrada / Ajuste</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="movimientoForm">
                            <div class="mb-3">
                                <label class="form-label">Producto *</label>
                                <select class="form-select" id="movProductoId" required></select>
                            </div>
                            <div class="row">
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">Tipo de Movimiento *</label>
                                    <select class="form-select" id="movTipo" required>
                                        <option value="entrada">Entrada (Sumar)</option>
                                        <option value="salida">Salida/Merma (Restar)</option>
                                    </select>
                                </div>
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">Cantidad *</label>
                                    <input type="number" class="form-control" id="movCantidad" min="1" required>
                                </div>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Motivo</label>
                                <input type="text" class="form-control" id="movMotivo" placeholder="Ej: Compra, Ajuste">
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                        <button type="button" class="btn btn-primary" onclick="guardarMovimiento()">Guardar</button>
                    </div>
                </div>
            </div>
        </div>
    `;

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
                <td><small class="text-muted">${item.codigo}</small></td>
                <td class="fw-bold">${item.nombre}</td>
                <td><span style="font-size: 1.1em;">${item.stock}</span> <small class="text-muted">(Min: ${item.stock_minimo})</small></td>
                <td>$${parseFloat(item.valor_stock_costo).toFixed(2)}</td>
                <td class="text-primary fw-bold">${item.cantidad_vendida}</td>
                <td class="text-success">$${parseFloat(item.ganancia).toFixed(2)}</td>
                <td><span class="badge bg-${badgeClass}">${item.estado}</span></td>
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
function exportarInvExcel() {
    const wb = XLSX.utils.book_new();
    const ws = {};
    let row = 0;

    const fechaInicio = document.getElementById('invFechaInicio').value;
    const fechaFin = document.getElementById('invFechaFin').value;

    function addCell(r, c, value, style = {}) {
        const cellRef = XLSX.utils.encode_cell({ r, c });
        ws[cellRef] = { v: value, t: typeof value === 'number' ? 'n' : 's', s: style };
        if (style.numFmt) ws[cellRef].z = style.numFmt;
    }

    addCell(row, 0, "REPORTE DE INVENTARIO Y VENTAS", { font: { sz: 14, bold: true } });
    row++;
    addCell(row, 0, `Período: ${fechaInicio} al ${fechaFin}`);
    row += 2;

    const headers = ["Código", "Producto", "Stock", "Valor Stock", "Vendidos", "Ganancia", "Estado"];
    headers.forEach((h, i) => addCell(row, i, h, { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "4472C4" } } }));
    row++;

    let tStock = 0, tVendidos = 0, tGanancia = 0;

    // Solo exporta lo que está visible en la tabla
    const filtroEstado = document.getElementById('invFiltroEstado').value;
    const search = document.getElementById('searchInv').value.toLowerCase();
    
    datosInventarioActuales.filter(item => {
        return (filtroEstado === 'Todos' || item.estado === filtroEstado) &&
               (item.nombre.toLowerCase().includes(search) || item.codigo.toLowerCase().includes(search));
    }).forEach(item => {
        addCell(row, 0, item.codigo);
        addCell(row, 1, item.nombre);
        addCell(row, 2, parseInt(item.stock));
        addCell(row, 3, parseFloat(item.valor_stock_costo), { numFmt: '"$"#,##0.00' });
        addCell(row, 4, parseInt(item.cantidad_vendida));
        addCell(row, 5, parseFloat(item.ganancia), { numFmt: '"$"#,##0.00' });
        addCell(row, 6, item.estado);
        
        tStock += parseFloat(item.valor_stock_costo);
        tVendidos += parseInt(item.cantidad_vendida);
        tGanancia += parseFloat(item.ganancia);
        row++;
    });

    row++;
    addCell(row, 2, "TOTALES:", { font: { bold: true } });
    addCell(row, 3, tStock, { font: { bold: true }, numFmt: '"$"#,##0.00' });
    addCell(row, 4, tVendidos, { font: { bold: true } });
    addCell(row, 5, tGanancia, { font: { bold: true }, numFmt: '"$"#,##0.00' });

    ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: row, c: 6 } });
    ws['!cols'] = [{wch: 15}, {wch: 35}, {wch: 10}, {wch: 15}, {wch: 12}, {wch: 15}, {wch: 12}];
    
    XLSX.utils.book_append_sheet(wb, ws, "Inventario");
    XLSX.writeFile(wb, "Reporte_Inventario.xlsx");
}

function exportarInvPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const fechaInicio = document.getElementById('invFechaInicio').value;
    const fechaFin = document.getElementById('invFechaFin').value;

    doc.setFillColor(33, 150, 243);
    doc.rect(0, 0, 210, 25, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.text("REPORTE DE INVENTARIO", 105, 15, { align: "center" });
    doc.setFontSize(10);
    doc.text(`Período: ${fechaInicio} - ${fechaFin}`, 105, 21, { align: "center" });

    const filtroEstado = document.getElementById('invFiltroEstado').value;
    const search = document.getElementById('searchInv').value.toLowerCase();
    
    const bodyData = [];
    let tStock = 0, tVendidos = 0, tGanancia = 0;

    datosInventarioActuales.filter(item => {
        return (filtroEstado === 'Todos' || item.estado === filtroEstado) &&
               (item.nombre.toLowerCase().includes(search) || item.codigo.toLowerCase().includes(search));
    }).forEach(item => {
        bodyData.push([
            item.codigo, 
            item.nombre, 
            item.stock, 
            `$${parseFloat(item.valor_stock_costo).toFixed(2)}`, 
            item.cantidad_vendida, 
            `$${parseFloat(item.ganancia).toFixed(2)}`, 
            item.estado
        ]);
        tStock += parseFloat(item.valor_stock_costo);
        tVendidos += parseInt(item.cantidad_vendida);
        tGanancia += parseFloat(item.ganancia);
    });

    doc.autoTable({
        startY: 35,
        head: [['Código', 'Producto', 'Stock', 'Valor Stock', 'Vendidos', 'Ganancia', 'Estado']],
        body: bodyData,
        foot: [['', '', 'TOTALES:', `$${tStock.toFixed(2)}`, tVendidos, `$${tGanancia.toFixed(2)}`, '']],
        theme: 'grid',
        headStyles: { fillColor: [33, 150, 243] },
        footStyles: { fillColor: [220, 220, 220], textColor: 0, fontStyle: 'bold' },
        styles: { fontSize: 8 }
    });

    doc.save("Reporte_Inventario.pdf");
}