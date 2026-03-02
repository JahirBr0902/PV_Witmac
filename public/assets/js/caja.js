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
        indicator.innerHTML = `<span class="badge bg-success" onclick="verResumenCaja()" style="cursor:pointer">
            <i class="bi bi-unlock-fill"></i> Caja Abierta: ${formatCurrency(cajaActual.monto_inicial)}
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

    const resumen = cajaActual.resumen;
    const montoEsperado = parseFloat(cajaActual.monto_inicial) + parseFloat(resumen.efectivo);

    Swal.fire({
        title: 'Resumen de Caja',
        html: `
            <div class="text-start">
                <p><strong>Apertura:</strong> ${formatDate(cajaActual.fecha_apertura)}</p>
                <hr>
                <p>Monto Inicial: ${formatCurrency(cajaActual.monto_inicial)}</p>
                <p>Ventas Efectivo (+): ${formatCurrency(resumen.efectivo)}</p>
                <p>Ventas Transferencia: ${formatCurrency(resumen.transferencia)}</p>
                <hr>
                <h4 class="text-center">Efectivo en Caja: ${formatCurrency(montoEsperado)}</h4>
            </div>
        `,
        showCancelButton: true,
        confirmButtonText: 'Hacer Corte de Caja',
        confirmButtonColor: '#d33',
        cancelButtonText: 'Cerrar'
    }).then((result) => {
        if (result.isConfirmed) {
            showCerrarCajaModal(montoEsperado);
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

// ========== HISTORIAL DE CORTES ==========

async function loadCortes() {
    const hoy = new Date().toISOString().split("T")[0];
    const hace30Dias = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    document.getElementById("pageContent").innerHTML = `
        <div class="fade-in">
            <h2 class="mb-4"><i class="bi bi-safe2"></i> Historial de Cortes de Caja</h2>
            
            <div class="card mb-3"><div class="card-body">
                <div class="row g-2 align-items-end">
                    <div class="col-md-4"><label class="form-label">Desde</label><input type="date" class="form-control" id="cajaFechaInicio" value="${hace30Dias}"></div>
                    <div class="col-md-4"><label class="form-label">Hasta</label><input type="date" class="form-control" id="cajaFechaFin" value="${hoy}"></div>
                    <div class="col-md-4"><button class="btn btn-primary w-100" onclick="renderHistorialCortes()"><i class="bi bi-search"></i> Consultar</button></div>
                </div>
            </div></div>

            <div class="card">
                <div class="card-body p-0">
                    <div class="table-responsive">
                        <table class="table table-hover mb-0">
                            <thead class="table-light">
                                <tr>
                                    <th>Apertura</th>
                                    <th>Cierre</th>
                                    <th>Vendedor</th>
                                    <th>M. Inicial</th>
                                    <th>Ventas (Efe)</th>
                                    <th>Esperado</th>
                                    <th>Real</th>
                                    <th>Diferencia</th>
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
        { render: (c) => `<small>${formatDate(c.fecha_apertura)}</small>` },
        { render: (c) => c.fecha_cierre ? `<small>${formatDate(c.fecha_cierre)}</small>` : '<span class="badge bg-success">Abierta</span>' },
        { field: "usuario_apertura" },
        { render: (c) => formatCurrency(c.monto_inicial) },
        { render: (c) => formatCurrency(c.ventas_efectivo) },
        { render: (c) => formatCurrency(c.monto_final_esperado) },
        { render: (c) => c.estado === 'cerrada' ? formatCurrency(c.monto_final_real) : '-' },
        { render: (c) => {
            if (c.estado !== 'cerrada') return '-';
            const diff = parseFloat(c.diferencia);
            const color = diff === 0 ? 'text-success' : 'text-danger';
            return `<strong class="${color}">${formatCurrency(diff)}</strong>`;
        }}
    ]);
}
