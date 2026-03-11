// ========== MÓDULO DE CAJA (Apertura y Corte) ==========

let cajaActual = null;

async function checkEstadoCaja() {
    try {
        const res = await apiPost('caja/estado', {}, { showLoader: false });
        if (res.success) {
            cajaActual = res.caja;
            updateCajaUI();
        }
    } catch (e) { console.error("Error al checar caja:", e); }
}

function updateCajaUI() {
    const indicator = document.getElementById('cajaStatusIndicator');
    if (!indicator) return;

    if (cajaActual) {
        const resumen = cajaActual.resumen;
        // Cálculo del efectivo real que debe haber en el cajón:
        // Inicial + Ventas (Efectivo) + Abonos (Efectivo) + Entradas - Salidas
        const totalEfectivo = parseFloat(cajaActual.monto_inicial) + 
                              parseFloat(resumen.efectivo) + 
                              parseFloat(resumen.abonos_efectivo || 0) + 
                              parseFloat(resumen.entradas) - 
                              parseFloat(resumen.salidas);

        indicator.innerHTML = `<span class="badge bg-success" onclick="verResumenCaja()" style="cursor:pointer" title="Clic para ver detalle">
            <i class="bi bi-cash-coin"></i> Efectivo en Caja: ${formatCurrency(totalEfectivo)}
        </span>`;
    } else {
        indicator.innerHTML = `<span class="badge bg-danger" onclick="showAbrirCajaModal()" style="cursor:pointer">
            <i class="bi bi-lock-fill"></i> Caja Cerrada (Clic para abrir)
        </span>`;
    }
}

function showAbrirCajaModal() {
    Swal.fire({
        title: 'Abrir Caja',
        text: 'Ingrese el monto inicial en efectivo:',
        input: 'number',
        inputAttributes: { min: 0, step: 0.01 },
        inputValue: 0,
        showCancelButton: true,
        confirmButtonText: 'Abrir Caja',
        cancelButtonText: 'Cancelar'
    }).then(async (result) => {
        if (result.isConfirmed) {
            const monto = parseFloat(result.value);
            if (isNaN(monto) || monto < 0) return notify("Error", "Monto inválido", "error");
            
            await apiPost('caja/abrir', { monto_inicial: monto }, { successMsg: "Caja abierta correctamente" });
            checkEstadoCaja();
        }
    });
}

async function verResumenCaja() {
    if (!cajaActual) return;

    const res = await apiPost('caja/estado', {}, { showLoader: true });
    if (!res.success) return;
    cajaActual = res.caja;

    const resumen = cajaActual.resumen;
    // Solo lo que es EFECTIVO afecta el monto esperado en caja física
    const montoEsperado = parseFloat(cajaActual.monto_inicial) + 
                          parseFloat(resumen.efectivo) + 
                          parseFloat(resumen.abonos_efectivo || 0) + 
                          parseFloat(resumen.entradas) - 
                          parseFloat(resumen.salidas);

    Swal.fire({
        title: 'Resumen de Caja',
        html: `
            <div class="text-start">
                <p><strong>Apertura:</strong> ${formatDate(cajaActual.fecha_apertura)}</p>
                <hr>
                <div class="d-flex justify-content-between"><span>Monto Inicial:</span> <span>${formatCurrency(cajaActual.monto_inicial)}</span></div>
                <div class="d-flex justify-content-between"><span>Ventas Efectivo (+):</span> <span>${formatCurrency(resumen.efectivo)}</span></div>
                <div class="d-flex justify-content-between text-success"><span>Abonos Efectivo (+):</span> <span>${formatCurrency(resumen.abonos_efectivo || 0)}</span></div>
                <div class="d-flex justify-content-between text-success"><span>Entradas Extras (+):</span> <span>${formatCurrency(resumen.entradas)}</span></div>
                <div class="d-flex justify-content-between text-danger"><span>Salidas Extras (-):</span> <span>${formatCurrency(resumen.salidas)}</span></div>
                <hr>
                <div class="d-flex justify-content-between"><h5>Efectivo en Caja:</h5> <h4>${formatCurrency(montoEsperado)}</h4></div>
                <hr>
                <div class="text-center text-muted small">
                    <p class="mb-0">Ventas Transferencia: ${formatCurrency(resumen.transferencia)}</p>
                    <p class="mb-0">Abonos Transferencia: ${formatCurrency(resumen.abonos_transfer || 0)}</p>
                </div>
            </div>
        `,
        showCancelButton: true,
        showDenyButton: true,
        confirmButtonText: 'Hacer Corte de Caja',
        confirmButtonColor: '#d33',
        denyButtonText: '<i class="bi bi-plus-minus"></i> Movimiento',
        denyButtonColor: '#0d6efd',
        cancelButtonText: 'Cerrar'
    }).then((result) => {
        if (result.isConfirmed) {
            showCerrarCajaModal(montoEsperado);
        } else if (result.isDenied) {
            showMovimientoCajaModal();
        }
    });
}

function showMovimientoCajaModal() {
    Swal.fire({
        title: 'Registrar Movimiento',
        html: `
            <select id="movTipo" class="form-select mb-3">
                <option value="salida">Salida (Gasto/Retiro)</option>
                <option value="entrada">Entrada (Cambio/Aporte)</option>
            </select>
            <input type="number" id="movMonto" class="form-control mb-3" placeholder="Monto" step="0.01" min="0.01">
            <input type="text" id="movMotivo" class="form-control" placeholder="Motivo del movimiento">
        `,
        showCancelButton: true,
        confirmButtonText: 'Guardar',
        preConfirm: () => {
            const tipo = document.getElementById('movTipo').value;
            const monto = parseFloat(document.getElementById('movMonto').value);
            const motivo = document.getElementById('movMotivo').value;
            if (!monto || monto <= 0 || !motivo) {
                Swal.showValidationMessage('Todos los campos son obligatorios');
            }
            return { tipo, monto, motivo };
        }
    }).then(async (result) => {
        if (result.isConfirmed) {
            await apiPost('movimientos/registrar', result.value, { successMsg: "Movimiento guardado" });
            verResumenCaja(); // Volver a mostrar el resumen actualizado
        }
    });
}

function showCerrarCajaModal(montoEsperado) {
    Swal.fire({
        title: 'Corte de Caja',
        text: 'Cuente el dinero físico en caja e ingrese el total:',
        input: 'number',
        inputAttributes: { min: 0, step: 0.01 },
        showCancelButton: true,
        confirmButtonText: 'Realizar Corte',
        cancelButtonText: 'Cancelar'
    }).then(async (result) => {
        if (result.isConfirmed) {
            const montoReal = parseFloat(result.value);
            const diferencia = montoReal - montoEsperado;

            let diffMsg = "";
            if (diferencia === 0) diffMsg = "Caja cuadrada perfectamente.";
            else if (diferencia > 0) diffMsg = `Sobrante de ${formatCurrency(diferencia)}.`;
            else diffMsg = `Faltante de ${formatCurrency(Math.abs(diferencia))}.`;

            const confirm = await confirmAction("¿Confirmar Corte?", `${diffMsg}
Esta acción cerrará la caja actual.`);
            
            if (confirm) {
                await apiPost('caja/cerrar', { monto_real: montoReal }, { successMsg: "Corte realizado con éxito" });
                cajaActual = null;
                updateCajaUI();
                loadPage('dashboard');
            }
        }
    });
}

// Formateador local para fecha y hora


// ========== HISTORIAL DE CORTES ==========

async function loadCortes() {
    const hoy = new Date().toISOString().split("T")[0];
    const hace30Dias = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    document.getElementById("pageContent").innerHTML = `
        <div class="fade-in">
            <h2 class="mb-4"><i class="bi bi-safe2"></i> Historial de Cortes de Caja</h2>
            
            <div class="card mb-3"><div class="card-body">
                <div class="row g-2 align-items-end">
                    <div class="col-md-3"><label class="form-label">Desde</label><input type="date" class="form-control" id="cajaFechaInicio" value="${hace30Dias}"></div>
                    <div class="col-md-3"><label class="form-label">Hasta</label><input type="date" class="form-control" id="cajaFechaFin" value="${hoy}"></div>
                    <div class="col-md-3"><button class="btn btn-primary w-100" onclick="renderHistorialCortes()"><i class="bi bi-search"></i> Consultar</button></div>
                    <div class="col-md-3"><button class="btn btn-danger w-100" onclick="exportarCortesPDF()"><i class="bi bi-file-earmark-pdf"></i> Exportar PDF</button></div>
                </div>
            </div></div>

            <div class="card">
                <div class="card-body p-0">
                    <div class="table-responsive">
                        <table class="table table-hover mb-0" style="font-size: 0.85rem;">
                            <thead class="table-light">
                                <tr>
                                    <th>Apertura</th>
                                    <th>Cierre</th>
                                    <th>Caja Inicial</th>
                                    <th>Total Ventas</th>
                                    <th>Entradas Extra</th>
                                    <th>Salidas Extra</th>
                                    <th>Total Turno</th>
                                    <th>Cierre Caja</th>
                                    <th>Diferencia</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody id="cortesTableBody"></tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    `;

    await renderHistorialCortes();
}

async function renderHistorialCortes() {
    const filtros = {
        fechaInicio: document.getElementById('cajaFechaInicio').value,
        fechaFin: document.getElementById('cajaFechaFin').value
    };

    const res = await apiPost('caja/historial', filtros);
    
    fillTable("cortesTableBody", res.data, [
        { render: (c) => `<strong>${formatDateTime(c.fecha_apertura)}</strong><br><small class="text-muted">${c.usuario_apertura}</small>` },
        { render: (c) => c.fecha_cierre 
            ? `<strong>${formatDateTime(c.fecha_cierre)}</strong><br><small class="text-muted">${c.usuario_cierre || '-'}</small>` 
            : '<span class="badge bg-success">Abierta</span>' 
        },
        { render: (c) => formatCurrency(c.monto_inicial) },
        { render: (c) => formatCurrency(c.ventas_efectivo) },
        { render: (c) => `<span class="text-success">${formatCurrency(c.entradas_extras)}</span>` },
        { render: (c) => `<span class="text-danger">${formatCurrency(c.salidas_extras)}</span>` },
        { render: (c) => `<strong>${formatCurrency(c.monto_final_esperado)}</strong>` },
        { render: (c) => c.estado === 'cerrada' ? formatCurrency(c.monto_final_real) : '-' },
        { render: (c) => {
            if (c.estado !== 'cerrada') return '-';
            const diff = parseFloat(c.diferencia);
            const color = diff === 0 ? 'text-success' : 'text-danger';
            return `<strong class="${color}">${formatCurrency(diff)}</strong>`;
        }},
        { render: (c) => `
            <button class="btn btn-sm btn-outline-primary" onclick="verDetalleSesionCaja(${c.id})" title="Ver detalle">
                <i class="bi bi-eye"></i>
            </button>
        `}
    ]);
}

async function verDetalleSesionCaja(id) {
    const res = await apiPost('caja/detalle', { id });
    if (!res.success) return;

    const c = res.data;
    
    // Cálculos precisos basados en los ingresos reales del momento
    const vEfe = c.ventas.reduce((sum, v) => v.metodo_pago === 'efectivo' ? sum + parseFloat(v.ingreso_inicial) : sum, 0);
    const vTra = c.ventas.reduce((sum, v) => v.metodo_pago === 'transferencia' ? sum + parseFloat(v.ingreso_inicial) : sum, 0);
    
    const aEfe = (c.abonos_detalle || []).reduce((sum, a) => a.metodo_pago === 'efectivo' ? sum + parseFloat(a.monto) : sum, 0);
    const aTra = (c.abonos_detalle || []).reduce((sum, a) => a.metodo_pago === 'transferencia' ? sum + parseFloat(a.monto) : sum, 0);

    const entradasExtras = parseFloat(c.entradas_extras || 0);
    const salidasExtras = parseFloat(c.salidas_extras || 0);
    const montoInicial = parseFloat(c.monto_inicial || 0);

    // El esperado real en caja física
    const esperadoCalculado = montoInicial + vEfe + aEfe + entradasExtras - salidasExtras;
    const totalBanco = vTra + aTra;

    let html = `
        <div class="text-start">
            <div class="row mb-3">
                <div class="col-6">
                    <small class="text-muted">Apertura:</small><br>
                    <strong>${formatDateTime(c.fecha_apertura)}</strong><br>
                    <small>${c.usuario_apertura_nombre}</small>
                </div>
                <div class="col-6 text-end">
                    <small class="text-muted">Cierre:</small><br>
                    <strong>${c.fecha_cierre ? formatDateTime(c.fecha_cierre) : 'SESIÓN ABIERTA'}</strong><br>
                    <small>${c.usuario_cierre_nombre || '-'}</small>
                </div>
            </div>

            <div class="row g-2 mb-3">
                <div class="col-md-6">
                    <div class="card border-success h-100">
                        <div class="card-header bg-success text-white py-1 small">FLUJO DE EFECTIVO (CAJA)</div>
                        <div class="card-body p-2 small">
                            <div class="d-flex justify-content-between"><span>Monto Inicial:</span> <span>${formatCurrency(montoInicial)}</span></div>
                            <div class="d-flex justify-content-between"><span>Ventas Efe (+):</span> <span>${formatCurrency(vEfe)}</span></div>
                            <div class="d-flex justify-content-between text-success"><span>Abonos Efe (+):</span> <span>${formatCurrency(aEfe)}</span></div>
                            <div class="d-flex justify-content-between text-success"><span>Entradas Extras (+):</span> <span>${formatCurrency(entradasExtras)}</span></div>
                            <div class="d-flex justify-content-between text-danger"><span>Salidas Extras (-):</span> <span>${formatCurrency(salidasExtras)}</span></div>
                            <hr class="my-1">
                            <div class="d-flex justify-content-between"><strong>Esperado en Caja:</strong> <strong>${formatCurrency(esperadoCalculado)}</strong></div>
                            <div class="d-flex justify-content-between"><strong>Efectivo Real:</strong> <strong>${c.estado === 'cerrada' ? formatCurrency(c.monto_final_real) : '-'}</strong></div>
                            <div class="d-flex justify-content-between border-top mt-1 pt-1">
                                <strong>Diferencia:</strong> 
                                <strong class="${parseFloat(c.diferencia) >= 0 ? 'text-success' : 'text-danger'}">
                                    ${c.estado === 'cerrada' ? formatCurrency(c.diferencia) : '-'}
                                </strong>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="card border-primary h-100">
                        <div class="card-header bg-primary text-white py-1 small">INGRESOS POR TRANSFERENCIA</div>
                        <div class="card-body p-2 small">
                            <div class="d-flex justify-content-between"><span>Ventas Trans (+):</span> <span>${formatCurrency(vTra)}</span></div>
                            <div class="d-flex justify-content-between text-primary"><span>Abonos Trans (+):</span> <span>${formatCurrency(aTra)}</span></div>
                            <hr class="my-1">
                            <div class="d-flex justify-content-between mt-2 align-items-center">
                                <span>Total Banco:</span> 
                                <h4 class="mb-0 text-primary">${formatCurrency(totalBanco)}</h4>
                            </div>
                            <p class="text-muted mt-2 mb-0" style="font-size: 0.7rem;">* Verifique estos montos en su estado de cuenta bancario.</p>
                        </div>
                    </div>
                </div>
            </div>

            <h6 class="border-bottom pb-1 mb-2 mt-4"><i class="bi bi-cash-stack"></i> Detalle de Abonos</h6>
            <div class="table-responsive mb-3" style="max-height: 250px; overflow-y: auto;">
                <table class="table table-sm table-striped small">
                    <thead><tr class="sticky-top bg-white"><th>Hora</th><th>Venta</th><th>Método</th><th class="text-end">Monto</th></tr></thead>
                    <tbody>
                        ${c.abonos_detalle.length ? c.abonos_detalle.map(a => `
                            <tr>
                                <td>${new Date(a.fecha).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
                                <td>${a.folio}</td>
                                <td><span class="badge bg-${a.metodo_pago === 'efectivo' ? 'success' : 'primary'}">${a.metodo_pago.toUpperCase()}</span></td>
                                <td class="text-end">${formatCurrency(a.monto)}</td>
                            </tr>
                        `).join('') : '<tr><td colspan="4" class="text-center text-muted">Sin abonos</td></tr>'}
                    </tbody>
                </table>
            </div>

            <h6 class="border-bottom pb-1 mb-2"><i class="bi bi-cart"></i> Ventas del Turno</h6>
            <div class="table-responsive" style="max-height: 350px; overflow-y: auto;">
                <table class="table table-sm table-striped small">
                    <thead><tr class="sticky-top bg-white"><th>Hora</th><th>Folio</th><th>Vendedor</th><th>Cliente</th><th>Método</th><th>Ingreso Real</th><th class="text-end">Total Nota</th></tr></thead>
                    <tbody>
                        ${c.ventas.length ? c.ventas.map(v => `
                            <tr>
                                <td>${new Date(v.fecha_venta).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
                                <td>${v.folio}</td>
                                <td><small>${v.vendedor_nombre}</small></td>
                                <td><small>${v.cliente_nombre || 'General'}</small></td>
                                <td><span class="text-${v.metodo_pago === 'efectivo' ? 'success' : 'primary'}">${v.metodo_pago.toUpperCase()}</span></td>
                                <td class="text-success fw-bold">${formatCurrency(v.ingreso_inicial)}</td>
                                <td class="text-end text-muted">${formatCurrency(v.total)}</td>
                            </tr>
                        `).join('') : '<tr><td colspan="7" class="text-center text-muted">Sin ventas</td></tr>'}
                    </tbody>
                </table>
            </div>
        </div>
    `;

    Swal.fire({
        title: 'Reporte Detallado de Caja',
        html: html,
        width: '850px',
        showCancelButton: true,
        confirmButtonText: '<i class="bi bi-file-earmark-pdf"></i> Imprimir PDF',
        confirmButtonColor: '#dc3545',
        cancelButtonText: 'Cerrar'
    }).then((result) => {
        if (result.isConfirmed) {
            exportarCorteDetalladoPDF(c);
        }
    });
}

function exportarCorteDetalladoPDF(c) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text("Reporte de Turno Detallado", 105, 15, { align: "center" });
    
    doc.setFontSize(10);
    doc.text(`Apertura: ${formatDateTime(c.fecha_apertura)}`, 14, 30);
    doc.text(`Cierre: ${c.fecha_cierre ? formatDateTime(c.fecha_cierre) : 'ABIERTA'}`, 14, 35);
    doc.text(`Cajero: ${c.usuario_apertura_nombre}`, 14, 40);

    const vEfe = c.ventas.reduce((sum, v) => v.metodo_pago === 'efectivo' ? sum + parseFloat(v.ingreso_inicial) : sum, 0);
    const vTra = c.ventas.reduce((sum, v) => v.metodo_pago === 'transferencia' ? sum + parseFloat(v.ingreso_inicial) : sum, 0);
    const aEfe = (c.abonos_detalle || []).reduce((sum, a) => a.metodo_pago === 'efectivo' ? sum + parseFloat(a.monto) : sum, 0);
    const aTra = (c.abonos_detalle || []).reduce((sum, a) => a.metodo_pago === 'transferencia' ? sum + parseFloat(a.monto) : sum, 0);

    // Resumen de Efectivo
    doc.setFont(undefined, 'bold');
    doc.text("RESUMEN DE EFECTIVO (CAJA FÍSICA)", 14, 50);
    doc.autoTable({
        startY: 53,
        head: [['Concepto', 'Monto']],
        body: [
            ['Monto Inicial', formatCurrency(c.monto_inicial)],
            ['Ventas en Efectivo (+)', formatCurrency(vEfe)],
            ['Abonos en Efectivo (+)', formatCurrency(aEfe)],
            ['Entradas Extras (+)', formatCurrency(c.entradas_extras)],
            ['Salidas Extras (-)', formatCurrency(c.salidas_extras)],
            ['TOTAL ESPERADO EN CAJA', formatCurrency(parseFloat(c.monto_inicial) + vEfe + aEfe + parseFloat(c.entradas_extras) - parseFloat(c.salidas_extras))],
            ['EFECTIVO REAL REGISTRADO', c.estado === 'cerrada' ? formatCurrency(c.monto_final_real) : '-'],
            ['DIFERENCIA', c.estado === 'cerrada' ? formatCurrency(c.diferencia) : '-']
        ],
        theme: 'striped',
        headStyles: { fillColor: [46, 204, 113] }
    });

    // Resumen Transferencia
    doc.setFont(undefined, 'bold');
    doc.text("RESUMEN DE TRANSFERENCIAS (BANCO)", 14, doc.lastAutoTable.finalY + 10);
    doc.autoTable({
        startY: doc.lastAutoTable.finalY + 13,
        head: [['Concepto', 'Monto']],
        body: [
            ['Ventas por Transferencia', formatCurrency(vTra)],
            ['Abonos por Transferencia', formatCurrency(aTra)],
            ['TOTAL INGRESOS BANCO', formatCurrency(vTra + aTra)]
        ],
        theme: 'striped',
        headStyles: { fillColor: [52, 152, 219] }
    });

    // --- TABLA DE ABONOS ---
    doc.setFont(undefined, 'bold');
    doc.text("DETALLE DE ABONOS RECIBIDOS", 14, doc.lastAutoTable.finalY + 10);
    doc.autoTable({
        startY: doc.lastAutoTable.finalY + 13,
        head: [['Hora', 'Venta', 'Método', 'Monto']],
        body: (c.abonos_detalle || []).map(a => [
            new Date(a.fecha).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
            a.folio,
            a.metodo_pago.toUpperCase(),
            formatCurrency(a.monto)
        ]),
        theme: 'grid',
        headStyles: { fillColor: [243, 156, 18] },
        columnStyles: { 3: { halign: 'right' } }
    });

    // --- TABLA DE MOVIMIENTOS EXTRA ---
    doc.setFont(undefined, 'bold');
    doc.text("MOVIMIENTOS DE CAJA (ENTRADAS/SALIDAS)", 14, doc.lastAutoTable.finalY + 10);
    doc.autoTable({
        startY: doc.lastAutoTable.finalY + 13,
        head: [['Hora', 'Tipo', 'Motivo', 'Monto']],
        body: (c.movimientos || []).map(m => [
            new Date(m.fecha).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
            m.tipo.toUpperCase(),
            m.motivo,
            formatCurrency(m.monto)
        ]),
        theme: 'grid',
        headStyles: { fillColor: [149, 165, 166] },
        columnStyles: { 3: { halign: 'right' } }
    });

    // --- TABLA DE VENTAS ---
    doc.setFont(undefined, 'bold');
    doc.text("LISTADO DE VENTAS DEL TURNO", 14, doc.lastAutoTable.finalY + 10);
    doc.autoTable({
        startY: doc.lastAutoTable.finalY + 13,
        head: [['Hora', 'Folio', 'Vendedor', 'Cliente', 'Método', 'Ingreso Real', 'Total Nota']],
        body: (c.ventas || []).map(v => [
            new Date(v.fecha_venta).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
            v.folio,
            v.vendedor_nombre,
            v.cliente_nombre || 'General',
            v.metodo_pago.toUpperCase(),
            formatCurrency(v.ingreso_inicial),
            formatCurrency(v.total)
        ]),
        theme: 'grid',
        headStyles: { fillColor: [46, 204, 113] },
        styles: { fontSize: 6 },
        columnStyles: { 5: { halign: 'right' }, 6: { halign: 'right' } }
    });

    doc.save(`Corte_Detallado_${c.id}.pdf`);
}

async function exportarCortesPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('landscape');
    
    const fechaInicio = document.getElementById('cajaFechaInicio').value;
    const fechaFin = document.getElementById('cajaFechaFin').value;

    const res = await apiPost('caja/historial', { fechaInicio, fechaFin });
    if (!res.success) return;

    doc.setFontSize(16);
    doc.text("Historial de Cortes de Caja Detallado", 148, 15, { align: "center" });
    doc.setFontSize(10);
    doc.text(`Periodo: ${fechaInicio} al ${fechaFin}`, 148, 22, { align: "center" });

    const body = res.data.map(c => [
        formatDateTime(c.fecha_apertura),
        c.fecha_cierre ? formatDateTime(c.fecha_cierre) : 'ABIERTA',
        c.usuario_apertura,
        formatCurrency(c.monto_inicial),
        formatCurrency(c.ventas_efectivo),
        formatCurrency(c.entradas_extras),
        formatCurrency(c.salidas_extras),
        formatCurrency(c.monto_final_esperado),
        c.estado === 'cerrada' ? formatCurrency(c.monto_final_real) : '-',
        c.estado === 'cerrada' ? formatCurrency(c.diferencia) : '-'
    ]);

    doc.autoTable({
        startY: 30,
        head: [['Apertura', 'Cierre', 'Vendedor', 'Inicial', 'Ventas', 'Entradas', 'Salidas', 'Esperado', 'Real', 'Dif.']],
        body: body,
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185] },
        styles: { fontSize: 7 } // Reducimos tamaño de fuente para que quepa en horizontal con tantas columnas
    });

    doc.save(`Cortes_Caja_Detallado_${fechaInicio}.pdf`);
}
