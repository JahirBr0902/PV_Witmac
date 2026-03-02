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
                                <h6 class="text-muted mb-1">Ventas Hoy</h6>
                                <h3 class="mb-0" id="ventasHoy">$0.00</h3>
                            </div>
                            <i class="bi bi-cash-stack stats-icon"></i>
                        </div>
                    </div>
                </div>
                <div class="col-md-3 mb-3">
                    <div class="card stats-card success">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <h6 class="text-muted mb-1">Total Productos</h6>
                                <h3 class="mb-0" id="totalProductos">0</h3>
                            </div>
                            <i class="bi bi-box-seam stats-icon"></i>
                        </div>
                    </div>
                </div>
                <div class="col-md-3 mb-3">
                    <div class="card stats-card warning">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <h6 class="text-muted mb-1">Cuentas Pendientes</h6>
                                <h3 class="mb-0" id="totalClientes">0</h3>
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
                    <div class="card">
                        <div class="card-header">
                            <i class="bi bi-clock-history"></i> Últimas Ventas
                        </div>
                        <div class="card-body" id="ultimasVentas">
                            <p class="text-center text-muted">Cargando...</p>
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
    document.getElementById("ventasHoy").textContent =
      "$" + parseFloat(data.estadisticas.ventasHoy || 0).toFixed(2);

    document.getElementById("totalProductos").textContent =
      data.estadisticas.totalProductos || 0;

    document.getElementById("totalClientes").textContent =
      data.estadisticas.totalClientes || 0;

    document.getElementById("stockBajo").textContent =
      data.estadisticas.stockBajo || 0;

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
