// ========== MÓDULO DE CLIENTES ==========
async function loadClientes() {
  const content = document.getElementById("pageContent");
  content.innerHTML = `
        <div class="fade-in">
            <div class="d-flex justify-content-between align-items-center mb-4">
                <h2><i class="bi bi-people"></i> Clientes</h2>
                <button class="btn btn-primary" onclick="showClienteModal()">
                    <i class="bi bi-plus-circle"></i> Nuevo Cliente
                </button>
            </div>
            
            <div class="card">
                <div class="card-body">
                    <div class="table-responsive">
                        <table class="table table-hover">
                            <thead>
                                <tr>
                                    <th>Nombre</th>
                                    <th>Teléfono</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody id="clientesTableBody">
                                <tr><td colspan="5" class="text-center">Cargando...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Modal Cliente -->
        <div class="modal fade" id="clienteModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="clienteModalTitle">Nuevo Cliente</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="clienteForm">
                            <input type="hidden" id="clienteId">
                            <div class="mb-3">
                                <label class="form-label">Nombre *</label>
                                <input type="text" class="form-control" id="clienteNombre" required>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Teléfono</label>
                                <input type="tel" class="form-control" id="clienteTelefono">
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                        <button type="button" class="btn btn-primary" onclick="saveCliente()">Guardar</button>
                    </div>
                </div>
            </div>
        </div>
    `;

  await loadClientesTable();
}

async function loadClientesTable() {
  try {
    const data = await apiPost("clientes/listar");

    const tbody = document.getElementById("clientesTableBody");

    if (Array.isArray(data) && data.length > 0) {
      let html = "";
      data.forEach((cliente) => {
        const botonEstado = cliente.activo
          ? `
        <button class="btn btn-sm btn-success"
            onclick="toggleClienteEstado(${cliente.id}, false)">
            <i class="bi bi-check-circle"></i>
        </button>
      `
          : `
        <button class="btn btn-sm btn-danger"
            onclick="toggleClienteEstado(${cliente.id}, true)">
            <i class="bi bi-x-circle"></i>
        </button>
      `;

        html += `
                    <tr>
                        <td>${cliente.nombre}</td>
                        <td>${cliente.telefono || "-"}</td>
                        <td>
                            <button class="btn btn-sm btn-warning" onclick='editCliente(${JSON.stringify(cliente)})'>
                                <i class="bi bi-pencil"></i>
                            </button>

                            ${botonEstado}
                        </td>
                    </tr>
                `;
      });
      tbody.innerHTML = html;
    } else {
      tbody.innerHTML =
        '<tr><td colspan="5" class="text-center text-muted">No hay clientes registrados</td></tr>';
    }
  } catch (error) {
    console.error("Error cargando clientes:", error);
  }
}

function showClienteModal() {
  document.getElementById("clienteModalTitle").textContent = "Nuevo Cliente";
  document.getElementById("clienteForm").reset();
  document.getElementById("clienteId").value = "";
  new bootstrap.Modal(document.getElementById("clienteModal")).show();
}

function editCliente(cliente) {
  document.getElementById("clienteModalTitle").textContent = "Editar Cliente";
  document.getElementById("clienteId").value = cliente.id;
  document.getElementById("clienteNombre").value = cliente.nombre;
  document.getElementById("clienteTelefono").value = cliente.telefono || "";
  new bootstrap.Modal(document.getElementById("clienteModal")).show();
}

async function saveCliente() {
  const id = document.getElementById("clienteId").value;
  const data = {
    nombre: document.getElementById("clienteNombre").value,
    telefono: document.getElementById("clienteTelefono").value,
  };

  if (id) data.id = id;

  try {
    const action = id ? "editar" : "nuevo";
    const result = await apiPost(`clientes/${action}`, data);

    if (result.success) {
      Swal.fire({
        icon: "success",
        title: "Éxito",
        text: result.message,
        timer: 1500,
      });
      bootstrap.Modal.getInstance(
        document.getElementById("clienteModal"),
      ).hide();
      loadClientesTable();
    } else {
      Swal.fire({ icon: "error", title: "Error", text: result.message });
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

async function toggleClienteEstado(id, nuevoEstado) {
  const texto = nuevoEstado ? "activar" : "desactivar";

  const confirm = await Swal.fire({
    title: `¿Deseas ${texto} este cliente?`,
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: `Sí, ${texto}`,
    cancelButtonText: "Cancelar",
  });

  if (!confirm.isConfirmed) return;

  try {
    const data = await apiPost("clientes/estatus", {
      id: id,
      activo: nuevoEstado,
    });

    if (data.success) {
      Swal.fire({
        icon: "success",
        title: "Actualizado",
        text: data.message,
        timer: 1200,
      });

      loadClientesTable();
    } else {
      Swal.fire("Error", data.message, "error");
    }
  } catch (error) {
    console.error(error);
    Swal.fire("Error", "No se pudo actualizar el estado", "error");
  }
}
// ========== MÓDULO DE REPORTES ==========
async function loadReportes() {
  const content = document.getElementById("pageContent");
  content.innerHTML = `
        <div class="fade-in">
            <h2 class="mb-4"><i class="bi bi-graph-up"></i> Reportes y Análisis</h2>
            
            <div class="row mb-4">
                <div class="col-md-6">
                    <div class="card">
                        <div class="card-header">
                            <i class="bi bi-calendar-range"></i> Rango de Fechas
                        </div>
                        <div class="card-body">
                            <div class="row">
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">Fecha Inicio</label>
                                    <input type="date" class="form-control" id="fechaInicio" value="${new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]}">
                                </div>
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">Fecha Fin</label>
                                    <input type="date" class="form-control" id="fechaFin" value="${new Date().toISOString().split("T")[0]}">
                                </div>
                            </div>
                            <button class="btn btn-primary w-100" onclick="loadVentasReporte()">
                                <i class="bi bi-search"></i> Consultar
                            </button>
                        </div>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="card">
                        <div class="card-header">
                            <i class="bi bi-download"></i> Exportar Datos
                        </div>
                        <div class="card-body">
                            <p class="text-muted">Exporta las ventas del período seleccionado</p>
                            <button class="btn btn-success me-2" onclick="exportarExcel()">
                                <i class="bi bi-file-earmark-excel"></i> Exportar a Excel
                            </button>
                            <button class="btn btn-danger" onclick="exportarPDF()">
                                <i class="bi bi-file-earmark-pdf"></i> Exportar a PDF
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="row">
                <div class="col-md-12">
                    <div class="card">
                        <div class="card-header">
                            <i class="bi bi-receipt"></i> Historial de Ventas
                        </div>
                        <div class="card-body">
                            <div class="table-responsive">
                                <table class="table table-hover">
                                    <thead>
                                        <tr>
                                            <th>Folio</th>
                                            <th>Cliente</th>
                                            <th>Vendedor</th>
                                            <th>Total</th>
                                            <th>Método Pago</th>
                                            <th>Fecha</th>
                                            <th>Estado</th>
                                            <th>Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody id="ventasReporteBody">
                                        <tr><td colspan="8" class="text-center">Selecciona un rango de fechas</td></tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Modal Detalle Venta -->
        <div class="modal fade" id="detalleVentaModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Detalle de Venta</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body" id="detalleVentaContent">
                    </div>
                </div>
            </div>
        </div>
        <!-- Modal Abono -->
<div class="modal fade" id="abonoModal" tabindex="-1">
    <div class="modal-dialog">
        <div class="modal-content">
            <div class="modal-header bg-warning text-white">
                <h5 class="modal-title">
                    <i class="bi bi-cash-stack"></i> Registrar Abono
                </h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
                <input type="hidden" id="abonoVentaId">
                
                <div class="alert alert-info">
                    <strong>Folio: <span id="abonoFolio"></span></strong><br>
                    <strong>Saldo actual: $<span id="abonoSaldoActual"></span></strong>
                </div>
                
                <div class="mb-3">
                    <label class="form-label">Monto a abonar</label>
                    <input type="number" 
                           class="form-control form-control-lg" 
                           id="abonoMonto" 
                           min="0.01" 
                           step="0.01" 
                           placeholder="Ingrese el monto">
                </div>
                
                <div class="mb-3" id="abonoNuevoSaldoContainer" style="display: none;">
                    <label class="form-label">Nuevo saldo:</label>
                    <h4 class="text-warning" id="abonoNuevoSaldo">$0.00</h4>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                    Cancelar
                </button>
<button type="button"
        class="btn btn-warning"
        onclick="registrarAbono()">
    <i class="bi bi-check-circle"></i> Registrar Abono
</button>

            </div>
        </div>
    </div>
</div>
    `;
}

async function loadVentasReporte() {
  const fechaInicio = document.getElementById("fechaInicio").value;
  const fechaFin = document.getElementById("fechaFin").value;

  try {
    const response = await apiPost("dashboard/exportar-ventas", {
      fechaInicio,
      fechaFin,
    });

    const tbody = document.getElementById("ventasReporteBody");

    if (response.success && response.data.length > 0) {
      let html = "";

      response.data.forEach((venta) => {
        const estadoBadge =
          venta.estado === "completada" ? "success" : "warning";
        const tieneSaldo = venta.saldo > 0;

        html += `
          <tr>
            <td><strong>${venta.folio}</strong></td>
            <td>${venta.cliente_nombre}</td>
            <td>${venta.vendedor_nombre}</td>
            <td>
              <strong class="text-success">$${parseFloat(venta.total).toFixed(2)}</strong>
              ${tieneSaldo ? `<br><small class="text-warning">Saldo: $${parseFloat(venta.saldo).toFixed(2)}</small>` : ""}
            </td>
            <td><span class="badge bg-info">${venta.metodo_pago}</span></td>
            <td>${formatDate(venta.fecha_venta)}</td>
            <td><span class="badge bg-${estadoBadge}">${venta.estado}</span></td>
            <td>
              <div class="btn-group btn-group-sm" role="group">
                <button class="btn btn-info" onclick="verDetalleVenta(${venta.id})" title="Ver detalle">
                  <i class="bi bi-eye"></i>
                </button>
                ${
                  tieneSaldo
                    ? `
                <button class="btn btn-warning" onclick="mostrarModalAbono(${venta.id}, '${venta.folio}', ${venta.saldo})" title="Registrar abono">
                  <i class="bi bi-cash-stack"></i> Abonar
                </button>
                `
                    : ""
                }
              </div>
            </td>
          </tr>
        `;
      });

      tbody.innerHTML = html;
    } else {
      tbody.innerHTML =
        '<tr><td colspan="8" class="text-center text-muted">No hay ventas en este período</td></tr>';
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

async function mostrarModalAbono(ventaId) {
  try {
    const venta = await apiPost("ventas/listar", { id: ventaId });

    document.getElementById("abonoVentaId").value = venta.id;
    document.getElementById("abonoFolio").textContent = venta.folio;
    document.getElementById("abonoSaldoActual").textContent = Number(
      venta.saldo,
    ).toFixed(2);

    document.getElementById("abonoMonto").value = "";
    document.getElementById("abonoNuevoSaldoContainer").style.display = "none";

    const modal = new bootstrap.Modal(document.getElementById("abonoModal"));
    modal.show();

    setTimeout(() => document.getElementById("abonoMonto").focus(), 300);
  } catch (error) {
    console.error(error);
    Swal.fire("Error", "No se pudo cargar la venta", "error");
  }
}

async function registrarAbono() {
  const ventaId = document.getElementById("abonoVentaId").value;
  const monto = Number(document.getElementById("abonoMonto").value);

  if (!monto || monto <= 0) {
    Swal.fire("Error", "Ingrese un monto válido", "error");
    return;
  }

  try {
    const response = await apiPost("ventas/abonar", {
      venta_id: ventaId,
      monto: monto,
    });

    if (response.success) {
      Swal.fire("Correcto", "Abono registrado", "success");
      loadVentasReporte();
    }
  } catch (error) {
    Swal.fire("Error", error.message || "Error al registrar", "error");
  }
}

async function verDetalleVenta(ventaId) {
  try {
    const venta = await apiPost("ventas/listar", {
      id: ventaId,
    });

    let html = `
      <div class="row mb-3">
        <div class="col-md-6">
          <p><strong>Folio:</strong> ${venta.folio}</p>
          <p><strong>Cliente:</strong> ${venta.cliente_nombre}</p>
          <p><strong>Vendedor:</strong> ${venta.vendedor_nombre}</p>
        </div>
        <div class="col-md-6">
          <p><strong>Fecha:</strong> ${formatDate(venta.fecha_venta)}</p>
          <p><strong>Método de Pago:</strong> ${venta.metodo_pago}</p>
          <p><strong>Estado:</strong> 
            <span class="badge bg-${venta.estado === "completada" ? "success" : "warning"}">
              ${venta.estado}
            </span>
          </p>
        </div>
      </div>

      <div class="row mb-3">
        <div class="col-md-6">
          <div class="card bg-light">
            <div class="card-body">
              <p class="mb-1"><strong>Monto Pagado:</strong></p>
              <h4 class="text-primary">$${parseFloat(venta.monto_pagado || 0).toFixed(2)}</h4>
            </div>
          </div>
        </div>
        <div class="col-md-6">
          <div class="card bg-light">
            <div class="card-body">
              <p class="mb-1"><strong>Saldo Pendiente:</strong></p>
              <h4 class="text-${venta.saldo > 0 ? "warning" : "success"}">
                $${parseFloat(venta.saldo || 0).toFixed(2)}
              </h4>
            </div>
          </div>
        </div>
      </div>

      <h6>Productos:</h6>
      <table class="table table-sm">
        <thead>
          <tr>
            <th>Producto</th>
            <th>Precio</th>
            <th>Cantidad</th>
            <th>Subtotal</th>
          </tr>
        </thead>
        <tbody>
    `;

    venta.detalles.forEach((item) => {
      html += `
        <tr>
          <td>${item.producto_nombre}</td>
          <td>$${parseFloat(item.precio_unitario).toFixed(2)}</td>
          <td>${item.cantidad}</td>
          <td>$${parseFloat(item.subtotal).toFixed(2)}</td>
        </tr>
      `;
    });

    html += `
        </tbody>
      </table>

      <hr>

      <div class="row">
        <div class="col-md-6">
          <p><strong>Subtotal:</strong> $${parseFloat(venta.subtotal).toFixed(2)}</p>
          <p><strong>Descuento:</strong> $${parseFloat(venta.descuento).toFixed(2)}</p>
        </div>
        <div class="col-md-6 text-end">
          <h5>
            <strong>Total:</strong> 
            <span class="text-success">$${parseFloat(venta.total).toFixed(2)}</span>
          </h5>
          <hr class="my-2">
          <p class="mb-1"><strong>Pagado:</strong> $${parseFloat(venta.monto_pagado || 0).toFixed(2)}</p>
          ${
            venta.saldo > 0
              ? `<p class="mb-1 text-warning"><strong>Saldo:</strong> $${parseFloat(venta.saldo).toFixed(2)}</p>`
              : `<p class="mb-1 text-success"><strong>Saldo:</strong> Pagado completo</p>`
          }
        </div>
      </div>
    `;

    document.getElementById("detalleVentaContent").innerHTML = html;
    new bootstrap.Modal(document.getElementById("detalleVentaModal")).show();
  } catch (error) {
    console.error("Error:", error);
  }
}

async function exportarExcel() {
  const fechaInicio = document.getElementById("fechaInicio").value;
  const fechaFin = document.getElementById("fechaFin").value;

  try {
    const response = await apiPost("ventas/full", {
      fechaInicio,
      fechaFin,
    });
    if (!response.success) return;

    let ventas = response.data;
    if (!Array.isArray(ventas)) ventas = [ventas];

    const wb = XLSX.utils.book_new();
    const ws = {};

    let row = 0;

    function addCell(r, c, value, style = {}) {
      const cellRef = XLSX.utils.encode_cell({ r, c });
      ws[cellRef] = {
        v: value,
        t: typeof value === "number" ? "n" : "s",
        s: style,
      };
      if (style.numFmt) {
        ws[cellRef].z = style.numFmt;
        ws[cellRef].t = "n";
      }
    }

    // Título
    addCell(row, 0, "REPORTE DE VENTAS DETALLADO", {
      font: { sz: 16, bold: true },
      alignment: { horizontal: "center", vertical: "center" },
    });

    ws["!merges"] = [{ s: { r: row, c: 0 }, e: { r: row, c: 10 } }];
    row += 2;

    // Headers
    const headers = [
      "Folio",
      "Cliente",
      "Vendedor",
      "Método",
      "Estado",
      "Fecha",
      "Cantidad",
      "P. Unitario",
      "Subtotal",
      "Monto Pagado",
      "Saldo",
    ];

    headers.forEach((h, i) => {
      addCell(row, i, h, {
        font: { bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "4472C4" } },
        alignment: { horizontal: "center", vertical: "center" },
        border: {
          top: { style: "thin", color: { rgb: "000000" } },
          bottom: { style: "thin", color: { rgb: "000000" } },
          left: { style: "thin", color: { rgb: "000000" } },
          right: { style: "thin", color: { rgb: "000000" } },
        },
      });
    });
    row++;

    let totalGeneral = 0;
    let totalPagadoGeneral = 0;
    let totalSaldoGeneral = 0;

    // Datos de ventas
    ventas.forEach((venta) => {
      addCell(row, 0, venta.folio, { font: { bold: true } });
      addCell(row, 1, venta.cliente_nombre);
      addCell(row, 2, venta.vendedor_nombre);
      addCell(row, 3, venta.metodo_pago);
      addCell(row, 4, venta.estado, {
        font: {
          color: { rgb: venta.estado === "pendiente" ? "FFA500" : "008000" },
        },
      });
      addCell(row, 5, venta.fecha_venta);
      addCell(row, 6, "");
      addCell(row, 7, "");
      addCell(row, 8, parseFloat(venta.total), {
        font: { bold: true },
        fill: { fgColor: { rgb: "E7E6E6" } },
        numFmt: '"$"#,##0.00',
      });
      addCell(row, 9, parseFloat(venta.monto_pagado || 0), {
        font: { color: { rgb: "0000FF" } },
        numFmt: '"$"#,##0.00',
      });
      addCell(row, 10, parseFloat(venta.saldo || 0), {
        font: { color: { rgb: venta.saldo > 0 ? "FFA500" : "008000" } },
        numFmt: '"$"#,##0.00',
      });

      totalGeneral += parseFloat(venta.total);
      totalPagadoGeneral += parseFloat(venta.monto_pagado || 0);
      totalSaldoGeneral += parseFloat(venta.saldo || 0);
      row++;

      // Detalles de productos
      venta.detalles.forEach((det) => {
        addCell(row, 0, "   ↳ " + det.producto_nombre, {
          alignment: { indent: 1 },
        });
        addCell(row, 1, "");
        addCell(row, 2, "");
        addCell(row, 3, "");
        addCell(row, 4, "");
        addCell(row, 5, "");
        addCell(row, 6, det.cantidad);
        addCell(row, 7, parseFloat(det.precio_unitario), {
          numFmt: '"$"#,##0.00',
        });
        addCell(row, 8, parseFloat(det.subtotal), {
          numFmt: '"$"#,##0.00',
        });
        addCell(row, 9, "");
        addCell(row, 10, "");
        row++;
      });

      row++;
    });

    // Totales
    addCell(row, 7, "TOTALES GENERALES:", {
      font: { bold: true },
      alignment: { horizontal: "right" },
    });

    addCell(row, 8, totalGeneral, {
      font: { bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "70AD47" } },
      numFmt: '"$"#,##0.00',
    });

    addCell(row, 9, totalPagadoGeneral, {
      font: { bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "4472C4" } },
      numFmt: '"$"#,##0.00',
    });

    addCell(row, 10, totalSaldoGeneral, {
      font: { bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: totalSaldoGeneral > 0 ? "FFA500" : "70AD47" } },
      numFmt: '"$"#,##0.00',
    });

    // Anchos de columna
    ws["!cols"] = [
      { wch: 25 },
      { wch: 20 },
      { wch: 18 },
      { wch: 15 },
      { wch: 15 },
      { wch: 20 },
      { wch: 10 },
      { wch: 15 },
      { wch: 12 },
      { wch: 15 },
      { wch: 12 },
    ];

    // Rango de celdas
    ws["!ref"] = XLSX.utils.encode_range({
      s: { r: 0, c: 0 },
      e: { r: row, c: 10 },
    });

    XLSX.utils.book_append_sheet(wb, ws, "Ventas");
    XLSX.writeFile(wb, "ventas_detalladas.xlsx");
  } catch (error) {
    console.error("Error:", error);
    alert("Error al generar el archivo Excel");
  }
}

async function exportarPDF() {
  const { jsPDF } = window.jspdf;

  const fechaInicio = document.getElementById("fechaInicio").value;
  const fechaFin = document.getElementById("fechaFin").value;

  try {
    const response = await apiPost("ventas/full", {
      fechaInicio,
      fechaFin,
    });

    if (!response.success) return;

    let ventas = response.data;
    if (!Array.isArray(ventas)) ventas = [ventas];

    const doc = new jsPDF();
    let totalGeneral = 0;
    let totalPagadoGeneral = 0;
    let totalSaldoGeneral = 0;

    // Header
    doc.setFillColor(33, 150, 243);
    doc.rect(0, 0, 210, 25, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.text("REPORTE DE VENTAS", 105, 15, { align: "center" });

    doc.setFontSize(10);
    doc.text(`Periodo: ${fechaInicio} - ${fechaFin}`, 105, 21, {
      align: "center",
    });

    doc.setTextColor(0, 0, 0);

    let y = 35;
    const margenInferior = 40; // Espacio reservado para totales y pie de página

    ventas.forEach((venta, index) => {
      totalGeneral += parseFloat(venta.total);
      totalPagadoGeneral += parseFloat(venta.monto_pagado || 0);
      totalSaldoGeneral += parseFloat(venta.saldo || 0);

      // Verificar espacio para el encabezado de venta (30px)
      if (y > 250) {
        doc.addPage();
        y = 20;
      }

      // Encabezado de venta
      doc.setDrawColor(200);
      doc.setFillColor(245, 245, 245);
      doc.roundedRect(14, y - 5, 182, 28, 3, 3, "FD");

      doc.setFontSize(11);
      doc.setFont(undefined, "bold");
      doc.text(`Folio: ${venta.folio}`, 18, y);

      doc.setFont(undefined, "normal");
      doc.text(`Cliente: ${venta.cliente_nombre}`, 18, y + 6);
      doc.text(`Vendedor: ${venta.vendedor_nombre}`, 18, y + 12);

      // Información de pagos
      doc.setFont(undefined, "bold");
      doc.text(`Total: $${parseFloat(venta.total).toFixed(2)}`, 140, y);

      doc.setFont(undefined, "normal");
      doc.setTextColor(0, 0, 255);
      doc.text(
        `Pagado: $${parseFloat(venta.monto_pagado || 0).toFixed(2)}`,
        140,
        y + 6,
      );

      doc.setTextColor(venta.saldo > 0 ? 255 : 0, venta.saldo > 0 ? 165 : 0, 0);
      doc.text(
        `Saldo: $${parseFloat(venta.saldo || 0).toFixed(2)}`,
        140,
        y + 12,
      );

      doc.setTextColor(0, 0, 0);

      y += 30;

      // Tabla de productos
      const productos = venta.detalles.map((det) => [
        det.producto_nombre,
        det.cantidad,
        `$${parseFloat(det.precio_unitario).toFixed(2)}`,
        `$${parseFloat(det.subtotal).toFixed(2)}`,
      ]);

      doc.autoTable({
        startY: y,
        head: [["Producto", "Cant.", "P. Unit", "Subtotal"]],
        body: productos,
        theme: "grid",
        headStyles: {
          fillColor: [33, 150, 243],
          textColor: 255,
          fontStyle: "bold",
        },
        styles: {
          fontSize: 9,
          cellPadding: 3,
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245],
        },
        margin: { bottom: margenInferior },
      });

      y = doc.lastAutoTable.finalY + 12;

      // Verificar si hay espacio para la siguiente venta
      if (y > 250 && index < ventas.length - 1) {
        doc.addPage();
        y = 20;
      }
    });

    // Verificar espacio para los totales generales (necesitamos ~25px)
    if (y > 260) {
      doc.addPage();
      y = 20;
    }

    // TOTALES GENERALES
    doc.setFillColor(76, 175, 80);
    doc.rect(14, y, 182, 24, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont(undefined, "bold");

    doc.text(`TOTAL GENERAL: $${totalGeneral.toFixed(2)}`, 105, y + 7, {
      align: "center",
    });

    doc.text(`TOTAL PAGADO: $${totalPagadoGeneral.toFixed(2)}`, 105, y + 13, {
      align: "center",
    });

    doc.text(`SALDO PENDIENTE: $${totalSaldoGeneral.toFixed(2)}`, 105, y + 19, {
      align: "center",
    });

    // Numeración de páginas
    const pageCount = doc.internal.getNumberOfPages();
    doc.setTextColor(0, 0, 0);
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(9);
      doc.setTextColor(150);
      doc.setFont(undefined, "normal");
      doc.text(`Página ${i} de ${pageCount}`, 105, 290, { align: "center" });
    }

    doc.save("ventas_detalladas.pdf");
  } catch (error) {
    console.error("Error al generar PDF:", error);
    alert("Error al generar el archivo PDF");
  }
}

// ========== MÓDULO DE USUARIOS (Solo Admin) ==========
async function loadUsuarios() {
  const content = document.getElementById("pageContent");
  content.innerHTML = `
        <div class="fade-in">
            <div class="d-flex justify-content-between align-items-center mb-4">
                <h2><i class="bi bi-person-badge"></i> Usuarios y Vendedores</h2>
                <button class="btn btn-primary" onclick="showUsuarioModal()">
                    <i class="bi bi-plus-circle"></i> Nuevo Usuario
                </button>
            </div>
            
            <div class="card">
                <div class="card-body">
                    <div class="table-responsive">
                        <table class="table table-hover">
                            <thead>
                                <tr>
                                    <th>Nombre</th>
                                    <th>Email</th>
                                    <th>Rol</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody id="usuariosTableBody">
                                <tr><td colspan="5" class="text-center">Cargando...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Modal Usuario -->
        <div class="modal fade" id="usuarioModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="usuarioModalTitle">Nuevo Usuario</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="usuarioForm">
                            <input type="hidden" id="usuarioId">
                            <div class="mb-3">
                                <label class="form-label">Nombre *</label>
                                <input type="text" class="form-control" id="usuarioNombre" required>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Email *</label>
                                <input type="email" class="form-control" id="usuarioEmail" required>
                            </div>
                            <div class="mb-3" id="passwordGroup">
                                <label class="form-label">Contraseña *</label>
                                <input type="password" class="form-control" id="usuarioPassword" required>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Rol *</label>
                                <select class="form-select" id="usuarioRol" required>
                                    <option value="vendedor">Vendedor</option>
                                    <option value="admin">Administrador</option>
                                </select>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                        <button type="button" class="btn btn-primary" onclick="saveUsuario()">Guardar</button>
                    </div>
                </div>
            </div>
        </div>
    `;

  await loadUsuariosTable();
}

async function loadUsuariosTable() {
  try {
    const data = await apiPost("usuarios/listar");

    const tbody = document.getElementById("usuariosTableBody");

    if (Array.isArray(data) && data.length > 0) {
      let html = "";
      data.forEach((usuario) => {
        const rolBadge = usuario.rol === "admin" ? "danger" : "primary";
        const botonEstado = usuario.activo
          ? `
        <button class="btn btn-sm btn-success"
            onclick="toggleUsuarioEstado(${usuario.id}, false)">
            <i class="bi bi-check-circle"></i>
        </button>
      `
          : `
        <button class="btn btn-sm btn-danger"
            onclick="toggleUsuarioEstado(${usuario.id}, true)">
            <i class="bi bi-x-circle"></i>
        </button>
      `;

        html += `
                    <tr>
                        <td>${usuario.nombre}</td>
                        <td>${usuario.email}</td>
                        <td><span class="badge bg-${rolBadge}">${usuario.rol}</span></td>
                        <td>
                            <button class="btn btn-sm btn-warning" onclick='editUsuario(${JSON.stringify(usuario)})'>
                                <i class="bi bi-pencil"></i>
                            </button>
                            ${botonEstado}
                    </tr>
                `;
      });
      tbody.innerHTML = html;
    } else {
      tbody.innerHTML =
        '<tr><td colspan="5" class="text-center text-muted">No hay usuarios registrados</td></tr>';
    }
  } catch (error) {
    console.error("Error cargando usuarios:", error);
  }
}

function showUsuarioModal() {
  document.getElementById("usuarioModalTitle").textContent = "Nuevo Usuario";
  document.getElementById("usuarioForm").reset();
  document.getElementById("usuarioId").value = "";
  document.getElementById("passwordGroup").style.display = "block";
  document.getElementById("usuarioPassword").required = true;
  new bootstrap.Modal(document.getElementById("usuarioModal")).show();
}

function editUsuario(usuario) {
  document.getElementById("usuarioModalTitle").textContent = "Editar Usuario";
  document.getElementById("usuarioId").value = usuario.id;
  document.getElementById("usuarioNombre").value = usuario.nombre;
  document.getElementById("usuarioEmail").value = usuario.email;
  document.getElementById("usuarioRol").value = usuario.rol;
  document.getElementById("passwordGroup").style.display = "none";
  document.getElementById("usuarioPassword").required = false;
  new bootstrap.Modal(document.getElementById("usuarioModal")).show();
}

async function saveUsuario() {
  const id = document.getElementById("usuarioId").value;
  const data = {
    nombre: document.getElementById("usuarioNombre").value,
    email: document.getElementById("usuarioEmail").value,
    rol: document.getElementById("usuarioRol").value,
  };

  if (!id) {
    data.password = document.getElementById("usuarioPassword").value;
  }

  if (id) data.id = id;

  try {
    const action = id ? "editar" : "nuevo";
    const result = await apiPost(`usuarios/${action}`, data);

    if (result.success) {
      Swal.fire({
        icon: "success",
        title: "Éxito",
        text: result.message,
        timer: 1500,
      });
      bootstrap.Modal.getInstance(
        document.getElementById("usuarioModal"),
      ).hide();
      loadUsuariosTable();
    } else {
      Swal.fire({ icon: "error", title: "Error", text: result.message });
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

async function toggleUsuarioEstado(id, nuevoEstado) {
  const texto = nuevoEstado ? "activar" : "desactivar";

  const confirm = await Swal.fire({
    title: `¿Deseas ${texto} este usuario?`,
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: `Sí, ${texto}`,
    cancelButtonText: "Cancelar",
  });

  if (!confirm.isConfirmed) return;

  try {
    const data = await apiPost("usuarios/estatus", {
      id: id,
      activo: nuevoEstado,
    });

    if (data.success) {
      Swal.fire({
        icon: "success",
        title: "Actualizado",
        text: data.message,
        timer: 1200,
      });

      loadUsuariosTable();
    } else {
      Swal.fire("Error", data.message, "error");
    }
  } catch (error) {
    console.error(error);
    Swal.fire("Error", "No se pudo actualizar el estado", "error");
  }
}
