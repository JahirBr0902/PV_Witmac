// ========== MÓDULO DE ESTADÍSTICAS AVANZADAS (SIMPLIFICADO) ==========

async function loadEstadisticas() {
    try {
        const user = await apiPost("session/info", {}, { showLoader: false });
        if (user.rol !== 'admin') {
            Swal.fire({ icon: 'error', title: 'Acceso denegado', text: 'Solo administradores pueden ver estadísticas' });
            if (typeof loadDashboard === 'function') loadDashboard();
            return;
        }

        const hoy = new Date().toISOString().split("T")[0];
        const hace30Dias = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

        const container = document.getElementById("pageContent");
        if (!container) return;

        container.innerHTML = `
        <div class="fade-in">
            <div class="d-flex justify-content-between align-items-center mb-4">
                <h2><i class="bi bi-bar-chart-steps"></i> Estadísticas de Negocio</h2>
                <div class="d-flex gap-2 align-items-end">
                    <div>
                        <label class="form-label small mb-1">Desde</label>
                        <input type="date" class="form-control form-control-sm" id="statsFechaInicio" value="${hace30Dias}">
                    </div>
                    <div>
                        <label class="form-label small mb-1">Hasta</label>
                        <input type="date" class="form-control form-control-sm" id="statsFechaFin" value="${hoy}">
                    </div>
                    <button class="btn btn-primary btn-sm" onclick="fetchAdvancedStats()"><i class="bi bi-arrow-repeat"></i> Actualizar</button>
                </div>
            </div>

            <div class="row g-4">
                <!-- Histórico de Créditos -->
                <div class="col-md-12">
                    <div class="card shadow-sm border-0">
                        <div class="card-header bg-white fw-bold py-3">
                            <i class="bi bi-journal-text text-warning me-2"></i> Histórico de Créditos y Pagos por Cliente
                        </div>
                        <div class="card-body p-0">
                            <div class="table-responsive">
                                <table class="table table-hover mb-0">
                                    <thead class="table-light">
                                        <tr>
                                            <th>Cliente</th>
                                            <th class="text-end">Total Pedido (Fiado)</th>
                                            <th class="text-end">Total Pagado</th>
                                            <th class="text-end">Saldo Pendiente</th>
                                            <th class="text-center">Estado de Cuenta</th>
                                        </tr>
                                    </thead>
                                    <tbody id="historialCreditoTable"></tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Top Clientes -->
                <div class="col-md-6">
                    <div class="card h-100 shadow-sm border-0">
                        <div class="card-header bg-white fw-bold py-3">
                            <i class="bi bi-people text-primary me-2"></i> Top 10 Clientes (Mayor Facturación)
                        </div>
                        <div class="card-body p-0">
                            <div class="table-responsive">
                                <table class="table table-hover mb-0">
                                    <thead class="table-light">
                                        <tr><th>Cliente</th><th class="text-center">Ventas</th><th class="text-end">Monto Total</th></tr>
                                    </thead>
                                    <tbody id="topClientesTable"></tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Productos Más Vendidos -->
                <div class="col-md-6">
                    <div class="card h-100 shadow-sm border-0">
                        <div class="card-header bg-white fw-bold py-3">
                            <i class="bi bi-box-seam text-info me-2"></i> Productos Más Vendidos (Volumen)
                        </div>
                        <div class="card-body p-0">
                            <div class="table-responsive">
                                <table class="table table-hover mb-0">
                                    <thead class="table-light">
                                        <tr><th>Producto</th><th class="text-center">Cant. Vendida</th><th class="text-end">Total Recaudado</th></tr>
                                    </thead>
                                    <tbody id="topProductosTable"></tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;

        setTimeout(fetchAdvancedStats, 100);

    } catch (error) {
        console.error("Error al cargar interfaz de estadísticas:", error);
    }
}

async function fetchAdvancedStats() {
    try {
        const fechaInicio = document.getElementById("statsFechaInicio").value;
        const fechaFin = document.getElementById("statsFechaFin").value;

        const data = await apiPost("dashboard/estadisticas", { fechaInicio, fechaFin });

        // Llenar Histórico de Créditos
        fillTable("historialCreditoTable", data.historialCredito, [
            { field: "cliente" },
            { render: (v) => `<div class="text-end text-muted">${formatCurrency(v.total_pedido)}</div>` },
            { render: (v) => `<div class="text-end text-success">${formatCurrency(v.total_pagado)}</div>` },
            { render: (v) => `<div class="text-end fw-bold ${parseFloat(v.saldo_actual) > 0 ? 'text-danger' : 'text-muted'}">${formatCurrency(v.saldo_actual)}</div>` },
            { render: (v) => {
                const perc = v.total_pedido > 0 ? (v.total_pagado / v.total_pedido) * 100 : 0;
                let color = perc >= 100 ? 'success' : (perc > 50 ? 'primary' : 'warning');
                return `<div class="px-3">
                            <div class="progress" style="height: 6px;">
                                <div class="progress-bar bg-${color}" role="progressbar" style="width: ${perc}%"></div>
                            </div>
                            <small class="text-muted" style="font-size: 0.65rem;">${perc.toFixed(0)}% cubierto</small>
                        </div>`;
            }}
        ]);

        // Llenar Top Clientes
        fillTable("topClientesTable", data.topClientes, [
            { field: "cliente" },
            { render: (v) => `<div class="text-center">${v.num_ventas}</div>` },
            { render: (v) => `<div class="text-end fw-bold text-primary">${formatCurrency(v.total_compras)}</div>` }
        ]);

        // Llenar Top Productos
        fillTable("topProductosTable", data.topProductos, [
            { field: "nombre" },
            { render: (v) => `<div class="text-center fw-bold">${v.total_vendido}</div>` },
            { render: (v) => `<div class="text-end text-info">${formatCurrency(v.total_recaudado)}</div>` }
        ]);

    } catch (error) {
        console.error("Error al obtener datos de estadísticas:", error);
    }
}