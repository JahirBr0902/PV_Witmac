// ========== MÓDULO DE CUENTAS POR COBRAR (CRÉDITOS) ==========

async function loadCreditos() {
    document.getElementById("pageContent").innerHTML = `
        <div class="fade-in">
            <h2 class="mb-4"><i class="bi bi-cash-stack"></i> Cuentas por Cobrar</h2>
            
            <div class="row mb-4">
                <div class="col-md-4">
                    <div class="card bg-warning text-dark">
                        <div class="card-body">
                            <h6>Total Pendiente de Cobro</h6>
                            <h3 id="totalCuentasPorCobrar">$0.00</h3>
                        </div>
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-header bg-white">
                    <div class="input-group w-50">
                        <span class="input-group-text"><i class="bi bi-search"></i></span>
                        <input type="text" id="searchCredito" class="form-control" placeholder="Buscar por cliente o folio..." onkeyup="filterCreditos()">
                    </div>
                </div>
                <div class="card-body p-0">
                    <div class="table-responsive">
                        <table class="table table-hover mb-0">
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
        </div>
    `;

    await fetchCreditos();
}

let creditosData = [];

async function fetchCreditos() {
    try {
        // Obtenemos solo las ventas con estado 'pendiente'
        const res = await apiPost('ventas/listar', { estado: 'pendiente' });
        creditosData = res;
        renderCreditos();
        
        // Calcular total pendiente
        const totalPendiente = creditosData.reduce((sum, v) => sum + parseFloat(v.saldo), 0);
        document.getElementById('totalCuentasPorCobrar').textContent = formatCurrency(totalPendiente);
    } catch (e) { console.error("Error al cargar créditos:", e); }
}

function renderCreditos(data = creditosData) {
    fillTable("creditosTableBody", data, [
        { field: "folio" },
        { render: (v) => `<small>${formatDateTime(v.fecha_venta)}</small>` },
        { field: "cliente_nombre" },
        { field: "vendedor_nombre" },
        { render: (v) => formatCurrency(v.total) },
        { render: (v) => formatCurrency(v.monto_pagado) },
        { render: (v) => `<strong class="text-danger">${formatCurrency(v.saldo)}</strong>` },
        { render: (v) => `
            <div class="btn-group">
                <button class="btn btn-sm btn-success" onclick="showAbonarModal(${v.id}, ${v.saldo})" title="Registrar Abono">
                    <i class="bi bi-plus-circle"></i> Abonar
                </button>
                <button class="btn btn-sm btn-outline-info" onclick="verDetalleVentaCredito(${v.id})" title="Ver detalle">
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
        title: 'Registrar Abono',
        html: `
            <p>Saldo actual: <strong>${formatCurrency(saldo)}</strong></p>
            <div class="mb-3 text-start">
                <label class="form-label">Método de Pago</label>
                <select id="abonoMetodo" class="form-select">
                    <option value="efectivo">Efectivo</option>
                    <option value="transferencia">Transferencia</option>
                </select>
            </div>
            <div class="text-start">
                <label class="form-label">Monto a abonar</label>
                <input type="number" id="abonoMonto" class="form-control" step="0.01" min="0.01" max="${saldo}" value="${saldo}">
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
                fetchCreditos(); // Recargar lista
            } catch (e) { console.error("Error al abonar:", e); }
        }
    });
}

async function verDetalleVentaCredito(id) {
    // Reutilizamos la lógica de ver detalle si ya existe en reportes o creamos una sencilla
    const v = await apiPost('ventas/listar', { id: id });
    
    let html = `
        <div class="text-start">
            <p><strong>Folio:</strong> ${v.folio} | <strong>Fecha:</strong> ${formatDateTime(v.fecha_venta)}</p>
            <p><strong>Cliente:</strong> ${v.cliente_nombre} | <strong>Vendedor:</strong> ${v.vendedor_nombre}</p>
            <table class="table table-sm">
                <thead><tr><th>Producto</th><th>Cant.</th><th>Precio</th><th>Subtotal</th></tr></thead>
                <tbody>
                    ${v.detalles.map(d => `
                        <tr>
                            <td>${d.producto_nombre}</td>
                            <td>${d.cantidad}</td>
                            <td>${formatCurrency(d.precio_unitario)}</td>
                            <td>${formatCurrency(d.subtotal)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            <div class="text-end">
                <h6>Total: ${formatCurrency(v.total)}</h6>
                <h6 class="text-success">Pagado: ${formatCurrency(v.monto_pagado)}</h6>
                <h5 class="text-danger">Saldo: ${formatCurrency(v.saldo)}</h5>
            </div>
        </div>
    `;

    Swal.fire({ title: 'Detalle de Venta a Crédito', html, width: '600px', confirmButtonText: 'Cerrar' });
}
