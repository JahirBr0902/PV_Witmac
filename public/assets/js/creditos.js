// ========== MÓDULO DE CUENTAS POR COBRAR (CRÉDITOS) ==========

async function loadCreditos() {
    document.getElementById("pageContent").innerHTML = `
        <div class="fade-in">
            <h2 class="mb-4"><i class="bi bi-cash-stack"></i> Cuentas por Cobrar</h2>
            
            <div class="row mb-4">
                <!-- Card de Total -->
                <div class="col-md-4">
                    <div class="card bg-warning text-dark h-100 shadow-sm">
                        <div class="card-body d-flex flex-column justify-content-center">
                            <h6 class="text-uppercase fw-bold small">Total Pendiente de Cobro</h6>
                            <h2 id="totalCuentasPorCobrar" class="mb-0 fw-bold">$0.00</h2>
                            <small class="mt-2 text-dark-50">Suma total de todos los créditos vigentes</small>
                        </div>
                    </div>
                </div>

                <!-- Card de Abono Masivo Lateral -->
                <div class="col-md-8">
                    <div class="card h-100 shadow-sm border-primary">
                        <div class="card-header bg-primary text-white py-2">
                            <i class="bi bi-layers-half"></i> Registrar Abono Masivo
                        </div>
                        <div class="card-body p-3">
                            <div class="row g-2">
                                <div class="col-md-6 position-relative">
                                    <label class="form-label small fw-bold">1. Buscar Cliente (Filtra tabla automáticamente)</label>
                                    <div class="input-group input-group-sm">
                                        <span class="input-group-text bg-white"><i class="bi bi-search text-primary"></i></span>
                                        <input type="text" class="form-control" id="searchClienteMasivo" placeholder="Nombre del cliente..." autocomplete="off">
                                    </div>
                                    <!-- Menú Desplegable de Resultados -->
                                    <div id="resultsClienteMasivo" class="search-results shadow-lg border rounded-bottom" 
                                         style="display:none; position: absolute; z-index: 1050; width: 100%; max-height: 200px; overflow-y: auto; background: white; top: 100%;">
                                    </div>
                                    <input type="hidden" id="masivoClienteId">
                                    
                                    <div id="infoDeudaCliente" class="mt-2 p-2 bg-light border rounded d-none">
                                        <div class="d-flex justify-content-between align-items-center">
                                            <span class="small">Deuda Total: <strong id="deudaTotalLabel" class="text-danger">$0.00</strong></span>
                                            <span class="badge bg-primary" id="cuentasPendientesLabel">0 cuentas</span>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="col-md-3">
                                    <label class="form-label small fw-bold">2. Método</label>
                                    <select id="masivoMetodo" class="form-select form-select-sm">
                                        <option value="efectivo">Efectivo</option>
                                        <option value="transferencia">Transferencia</option>
                                    </select>
                                </div>

                                <div class="col-md-3">
                                    <label class="form-label small fw-bold">3. Monto</label>
                                    <input type="number" id="masivoMonto" class="form-control form-control-sm border-primary fw-bold" step="0.01" placeholder="0.00">
                                </div>
                            </div>
                            <div class="d-flex justify-content-end mt-3">
                                <button class="btn btn-sm btn-outline-secondary me-2" onclick="limpiarFormMasivo()">Limpiar</button>
                                <button class="btn btn-sm btn-primary px-4 shadow-sm" onclick="procesarAbonoMasivo()">
                                    <i class="bi bi-check-circle"></i> Aplicar Abono a Cliente
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="card shadow-sm">
                <div class="card-header bg-white d-flex justify-content-between align-items-center py-3">
                    <h6 class="mb-0 fw-bold"><i class="bi bi-list-ul text-primary"></i> Detalle de Créditos Pendientes</h6>
                    <div class="input-group w-50">
                        <span class="input-group-text bg-light border-end-0"><i class="bi bi-funnel"></i></span>
                        <input type="text" id="searchCredito" class="form-control form-control-sm border-start-0 bg-light" placeholder="Filtrar por folio..." onkeyup="filterCreditos()">
                    </div>
                </div>
                <div class="card-body p-0">
                    <div class="table-responsive">
                        <table class="table table-hover mb-0" style="font-size: 0.85rem;">
                            <thead class="table-light">
                                <tr>
                                    <th>Folio</th>
                                    <th>Fecha</th>
                                    <th>Cliente</th>
                                    <th>Vendedor</th>
                                    <th>Total</th>
                                    <th>Pagado</th>
                                    <th>Saldo Pendiente</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody id="creditosTableBody"></tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>`;

    initBuscadorMasivo();
    await fetchCreditos();
}

let creditosData = [];

async function fetchCreditos() {
    try {
        const res = await apiPost('ventas/listar', { estado: 'pendiente' });
        creditosData = res || [];
        renderCreditos();
        
        const totalPendiente = creditosData.reduce((sum, v) => sum + parseFloat(v.saldo), 0);
        document.getElementById('totalCuentasPorCobrar').textContent = formatCurrency(totalPendiente);
    } catch (e) { console.error("Error al cargar créditos:", e); }
}

function renderCreditos(data = creditosData) {
    fillTable("creditosTableBody", data, [
        { field: "folio" },
        { render: (v) => `<small>${formatDateTime(v.fecha_venta)}</small>` },
        { render: (v) => `<span class="fw-bold">${v.cliente_nombre}</span>` },
        { field: "vendedor_nombre" },
        { render: (v) => formatCurrency(v.total) },
        { render: (v) => formatCurrency(v.monto_pagado) },
        { render: (v) => `<strong class="text-danger">${formatCurrency(v.saldo)}</strong>` },
        { render: (v) => `
            <div class="btn-group">
                <button class="btn btn-xs btn-success" onclick="showAbonarModal(${v.id}, ${v.saldo})" title="Abonar a esta cuenta">
                    <i class="bi bi-plus"></i>
                </button>
                <button class="btn btn-xs btn-outline-info" onclick="verDetalleVentaCredito(${v.id})" title="Ver detalle">
                    <i class="bi bi-eye"></i>
                </button>
            </div>
        `}
    ]);
}

function filterCreditos() {
    const q = document.getElementById('searchCredito').value.toLowerCase();
    const filtered = creditosData.filter(v => 
        v.folio.toLowerCase().includes(q) || 
        v.cliente_nombre.toLowerCase().includes(q)
    );
    renderCreditos(filtered);
}

function showAbonarModal(ventaId, saldo) {
    Swal.fire({
        title: 'Registrar Abono Individual',
        html: `
            <div class="text-center mb-3">
                <div class="p-3 bg-light rounded border">
                    <small class="text-muted d-block text-uppercase">Saldo Pendiente</small>
                    <h3 class="text-danger mb-0">${formatCurrency(saldo)}</h3>
                </div>
            </div>
            <div class="mb-3 text-start">
                <label class="form-label fw-bold">Método de Pago</label>
                <select id="abonoMetodo" class="form-select">
                    <option value="efectivo">Efectivo</option>
                    <option value="transferencia">Transferencia</option>
                </select>
            </div>
            <div class="text-start">
                <label class="form-label fw-bold">Monto a abonar</label>
                <input type="number" id="abonoMonto" class="form-control form-control-lg" step="0.01" min="0.01" max="${saldo}" value="${saldo}">
            </div>
        `,
        showCancelButton: true,
        confirmButtonText: 'Registrar Abono',
        cancelButtonText: 'Cancelar',
        preConfirm: () => {
            const monto = parseFloat(document.getElementById('abonoMonto').value);
            const metodo_pago = document.getElementById('abonoMetodo').value;
            if (isNaN(monto) || monto <= 0 || monto > saldo) {
                Swal.showValidationMessage('Monto inválido');
                return false;
            }
            return { monto, metodo_pago };
        }
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                await apiPost('ventas/abonar', { 
                    venta_id: ventaId, 
                    monto: result.value.monto, 
                    metodo_pago: result.value.metodo_pago 
                }, { successMsg: "Abono registrado con éxito" });
                fetchCreditos();
            } catch (e) { console.error("Error al abonar:", e); }
        }
    });
}

async function verDetalleVentaCredito(id) {
    const v = await apiPost('ventas/listar', { id: id });
    
    let html = `
        <div class="text-start">
            <p class="mb-1"><strong>Folio:</strong> ${v.folio} | <strong>Fecha:</strong> ${formatDateTime(v.fecha_venta)}</p>
            <p><strong>Cliente:</strong> ${v.cliente_nombre} | <strong>Vendedor:</strong> ${v.vendedor_nombre}</p>
            <div class="table-responsive">
                <table class="table table-sm table-striped">
                    <thead class="table-light"><tr><th>Producto</th><th class="text-center">Cant.</th><th>Subtotal</th></tr></thead>
                    <tbody>
                        ${v.detalles.map(d => `
                            <tr>
                                <td>${d.producto_nombre}</td>
                                <td class="text-center">${d.cantidad}</td>
                                <td class="text-end">${formatCurrency(d.subtotal)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            <div class="text-end mt-3 border-top pt-2">
                <p class="mb-1">Total: <strong>${formatCurrency(v.total)}</strong></p>
                <p class="mb-1 text-success">Pagado: <strong>${formatCurrency(v.monto_pagado)}</strong></p>
                <h4 class="text-danger mt-1">Saldo: ${formatCurrency(v.saldo)}</h4>
            </div>
        </div>
    `;

    Swal.fire({ title: 'Detalle de Venta a Crédito', html, width: '600px', confirmButtonText: 'Cerrar' });
}

function initBuscadorMasivo() {
    const input = document.getElementById('searchClienteMasivo');
    const results = document.getElementById('resultsClienteMasivo');
    
    input.addEventListener('input', async () => {
        const q = input.value.trim();
        
        // Sincronización: Filtrar tabla al mismo tiempo
        if (q === "") {
            renderCreditos(creditosData);
            results.style.display = 'none';
            document.getElementById('infoDeudaCliente').classList.add('d-none');
            return;
        }

        // Filtro local inmediato de la tabla
        const filtered = creditosData.filter(v => 
            v.cliente_nombre.toLowerCase().includes(q.toLowerCase())
        );
        renderCreditos(filtered);

        if (q.length < 2) { results.style.display = 'none'; return; }
        
        // Búsqueda en API para el dropdown
        const res = await apiPost('clientes/listar', { q }, { showLoader: false });
        if (res.length > 0) {
            results.innerHTML = res.map(c => `
                <div class="search-result-item p-2 border-bottom" style="cursor:pointer" onclick="selectClienteMasivo(${c.id}, '${c.nombre}')">
                    <div class="fw-bold text-primary">${c.nombre}</div>
                    <small class="text-muted"><i class="bi bi-telephone"></i> ${c.telefono || 'Sin tel.'}</small>
                </div>
            `).join('');
            results.style.display = 'block';
        } else {
            results.style.display = 'none';
        }
    });

    // Cerrar dropdown al hacer clic fuera
    document.addEventListener('click', (e) => {
        if (e.target !== input && e.target !== results) results.style.display = 'none';
    });
}

async function selectClienteMasivo(id, nombre) {
    document.getElementById('masivoClienteId').value = id;
    document.getElementById('searchClienteMasivo').value = nombre;
    document.getElementById('resultsClienteMasivo').style.display = 'none';
    
    // Filtrar la tabla específicamente para este cliente seleccionado
    const deudas = creditosData.filter(v => v.cliente_id == id);
    renderCreditos(deudas);

    const totalDeuda = deudas.reduce((sum, v) => sum + parseFloat(v.saldo), 0);
    
    const info = document.getElementById('infoDeudaCliente');
    document.getElementById('deudaTotalLabel').textContent = formatCurrency(totalDeuda);
    document.getElementById('cuentasPendientesLabel').textContent = `${deudas.length} cuentas`;
    info.classList.remove('d-none');
    
    document.getElementById('masivoMonto').value = totalDeuda.toFixed(2);
    document.getElementById('masivoMonto').focus();
}

function limpiarFormMasivo() {
    document.getElementById('masivoClienteId').value = "";
    document.getElementById('searchClienteMasivo').value = "";
    document.getElementById('masivoMonto').value = "";
    document.getElementById('infoDeudaCliente').classList.add('d-none');
    renderCreditos(creditosData);
}

async function procesarAbonoMasivo() {
    const clienteId = document.getElementById('masivoClienteId').value;
    const monto = parseFloat(document.getElementById('masivoMonto').value);
    const metodo = document.getElementById('masivoMetodo').value;
    const nombre = document.getElementById('searchClienteMasivo').value;
    
    if (!clienteId) return notify("Error", "Seleccione un cliente primero", "error");
    if (isNaN(monto) || monto <= 0) return notify("Error", "Monto de abono inválido", "error");
    
    const confirm = await confirmAction("¿Aplicar Abono Masivo?", `Se abonará ${formatCurrency(monto)} a las deudas de <strong>${nombre}</strong>.`);
    if (!confirm) return;

    const res = await apiPost('ventas/abonarMasivo', {
        cliente_id: clienteId,
        monto: monto,
        metodo_pago: metodo
    }, { successMsg: "Abono masivo procesado correctamente" });
    
    if (res.success) {
        limpiarFormMasivo();
        fetchCreditos();
    }
}