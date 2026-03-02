// ========== MÓDULO DE DASHBOARD ==========
async function loadDashboard() {
  const content = document.getElementById("pageContent");
  content.innerHTML = `
        <div class="fade-in">
            
            <div class="row" id="statsCards">
                <div class="col-md-3 mb-3">
                    <div class="card stats-card primary">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <h6 class="text-muted mb-1">Efectivo Hoy</h6>
                                <h3 class="mb-0" id="ventasHoy">$0.00</h3>
                            </div>
                            <i class="bi bi-cash stats-icon"></i>
                        </div>
                    </div>
                </div>
                <div class="col-md-3 mb-3">
                    <div class="card stats-card success">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <h6 class="text-muted mb-1">Transferencia Hoy</h6>
                                <h3 class="mb-0" id="ventasTransfer">$0.00</h3>
                            </div>
                            <i class="bi bi-bank stats-icon"></i>
                        </div>
                    </div>
                </div>
                <div class="col-md-3 mb-3">
                    <div class="card stats-card warning">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <h6 class="text-muted mb-1">Cuentas por Cobrar</h6>
                                <h3 class="mb-0" id="totalPendiente">$0.00</h3>
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
                    <div class="card shadow-sm border-0 h-100">
                        <div class="card-header bg-white py-3">
                            <i class="bi bi-clock-history"></i> Últimas Ventas
                        </div>
                        <div class="card-body p-0" id="ultimasVentas">
                            <p class="text-center text-muted p-4">Cargando...</p>
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
    document.getElementById("ventasHoy").textContent = formatCurrency(data.estadisticas.ventasEfectivoHoy || 0);

    document.getElementById("ventasTransfer").textContent = formatCurrency(data.estadisticas.ventasTransferHoy || 0);

    document.getElementById("totalPendiente").textContent = formatCurrency(data.estadisticas.totalPendiente || 0);

    document.getElementById("stockBajo").textContent = data.estadisticas.stockBajo || 0;

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
