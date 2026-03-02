// ========== MÓDULO DE REPORTES (Simplificado y Corregido) ==========

async function loadReportes() {
  const hoy = new Date().toISOString().split("T")[0];
  const hace7Dias = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  document.getElementById("pageContent").innerHTML = `
    <div class="fade-in">
        <h2 class="mb-4"><i class="bi bi-graph-up"></i> Reportes de Ventas</h2>

        <div class="card mb-4"><div class="card-body">
            <div class="row g-3 align-items-end">
                <div class="col-md-3"><label class="form-label">Desde</label><input type="date" class="form-control" id="fechaInicio" value="${hace7Dias}"></div>
                <div class="col-md-3"><label class="form-label">Hasta</label><input type="date" class="form-control" id="fechaFin" value="${hoy}"></div>
                <div class="col-md-2"><label class="form-label">Estado</label>
                    <select class="form-select" id="filtroEstado">
                        <option value="Todos">Todos</option><option value="completada">Completada</option>
                        <option value="pendiente">Pendiente</option><option value="cancelada">Cancelada</option>
                    </select>
                </div>
                <div class="col-md-4">
                    <div class="d-flex gap-2">
                        <button class="btn btn-primary flex-fill" onclick="loadVentasReporte()"><i class="bi bi-search"></i> Consultar</button>
                        <button class="btn btn-success flex-fill" onclick="exportarExcel()"><i class="bi bi-file-earmark-excel"></i> Excel</button>
                        <button class="btn btn-danger flex-fill" onclick="exportarPDF()"><i class="bi bi-file-earmark-pdf"></i> PDF</button>
                    </div>
                </div>
            </div>
        </div></div>

        <div class="card">
            <div class="card-header bg-white"><i class="bi bi-receipt"></i> Historial de Ventas</div>
            <div class="card-body p-0">
                <div class="table-responsive">
                    <table class="table table-hover mb-0">
                        <thead class="table-light">
                            <tr><th>Folio</th><th>Cliente</th><th>Vendedor</th><th>Total</th><th>Método</th><th>Fecha</th><th>Estado</th><th>Acciones</th></tr>
                        </thead>
                        <tbody id="ventasReporteBody"></tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>

    <!-- Modales -->
    <div class="modal fade" id="detalleVentaModal" tabindex="-1"><div class="modal-dialog modal-lg"><div class="modal-content">
        <div class="modal-header"><h5><i class="bi bi-receipt"></i> Detalle de Venta</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
        <div class="modal-body" id="detalleVentaContent"></div>
    </div></div></div>

    <div class="modal fade" id="abonoModal" tabindex="-1"><div class="modal-dialog"><div class="modal-content">
        <div class="modal-header bg-warning text-white"><h5>Registrar Abono</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
        <div class="modal-body">
            <input type="hidden" id="abonoVentaId">
            <div class="alert alert-info"><strong>Folio:</strong> <span id="abonoFolio"></span><br><strong>Saldo:</strong> <span id="abonoSaldoActual"></span></div>
            <div class="mb-3"><label class="form-label">Monto a abonar</label><input type="number" class="form-control" id="abonoMonto" step="0.01"></div>
        </div>
        <div class="modal-footer"><button type="button" class="btn btn-warning" onclick="registrarAbono()">Registrar Abono</button></div>
    </div></div></div>`;

    await loadVentasReporte();
}

async function loadVentasReporte() {
  const filtros = {
    fechaInicio: document.getElementById("fechaInicio").value,
    fechaFin: document.getElementById("fechaFin").value,
    estado: document.getElementById("filtroEstado").value
  };

  const data = await apiPost("ventas/listar", filtros);
  fillTable("ventasReporteBody", data, [
    { render: (v) => `<strong>${v.folio}</strong>` },
    { field: "cliente_nombre" },
    { field: "vendedor_nombre" },
    { render: (v) => `<div>${formatCurrency(v.total)}</div>${v.saldo > 0 ? `<small class="text-warning">Saldo: ${formatCurrency(v.saldo)}</small>` : ""}` },
    { render: (v) => `<span class="badge bg-info">${v.metodo_pago}</span>` },
    { render: (v) => formatDate(v.fecha_venta) },
    { render: (v) => `<span class="badge bg-${v.estado === 'completada' ? 'success' : (v.estado === 'cancelada' ? 'danger' : 'warning')}">${v.estado}</span>` },
    { render: (v) => `
        <button class="btn btn-sm btn-info" onclick="verDetalleVenta(${v.id})"><i class="bi bi-eye"></i></button>
        ${v.saldo > 0 ? `<button class="btn btn-sm btn-warning" onclick="mostrarModalAbono(${v.id}, '${v.folio}', ${v.saldo})"><i class="bi bi-cash-stack"></i></button>` : ""}
    `}
  ]);
}

async function verDetalleVenta(ventaId) {
  const v = await apiPost("ventas/listar", { id: ventaId });
  
  let html = `
    <div class="row mb-3">
      <div class="col-6">
        <p><strong>Folio:</strong> ${v.folio}<br><strong>Cliente:</strong> ${v.cliente_nombre}<br><strong>Fecha:</strong> ${formatDate(v.fecha_venta)}</p>
      </div>
      <div class="col-6 text-end">
        <p><strong>Vendedor:</strong> ${v.vendedor_nombre}<br><strong>Método:</strong> ${v.metodo_pago}<br><strong>Estado:</strong> ${v.estado}</p>
      </div>
    </div>
    <table class="table table-sm">
      <thead class="table-light"><tr><th>Producto</th><th>Precio</th><th>Cant.</th><th>Subtotal</th></tr></thead>
      <tbody>
        ${v.detalles.map(d => `<tr><td>${d.producto_nombre}</td><td>${formatCurrency(d.precio_unitario)}</td><td>${d.cantidad}</td><td>${formatCurrency(d.subtotal)}</td></tr>`).join('')}
      </tbody>
    </table>
    <div class="row mt-3"><div class="col-6 offset-6 text-end">
        <p>Subtotal: ${formatCurrency(v.subtotal)}<br>Descuento: -${formatCurrency(v.descuento)}<br><h4>Total: ${formatCurrency(v.total)}</h4>
        <span class="text-primary">Pagado: ${formatCurrency(v.monto_pagado)}</span> / <span class="text-warning">Saldo: ${formatCurrency(v.saldo)}</span></p>
    </div></div>`;

  document.getElementById("detalleVentaContent").innerHTML = html;
  new bootstrap.Modal(document.getElementById("detalleVentaModal")).show();
}

function mostrarModalAbono(id, folio, saldo) {
  document.getElementById("abonoVentaId").value = id;
  document.getElementById("abonoFolio").textContent = folio;
  document.getElementById("abonoSaldoActual").textContent = formatCurrency(saldo);
  document.getElementById("abonoMonto").value = "";
  new bootstrap.Modal(document.getElementById("abonoModal")).show();
}

async function registrarAbono() {
  const data = {
    venta_id: document.getElementById("abonoVentaId").value,
    monto: document.getElementById("abonoMonto").value
  };

  if (!data.monto || data.monto <= 0) return notify("Error", "Monto inválido", "error");

  await apiPost("ventas/abonar", data, { successMsg: "Abono registrado" });
  bootstrap.Modal.getInstance(document.getElementById("abonoModal")).hide();
  loadVentasReporte();
}

// Lógica de Exportación
async function exportarExcel() {
  const { isConfirmed: conDetalles } = await Swal.fire({
    title: 'Exportar Excel',
    text: "¿Deseas incluir el detalle de productos vendidos en cada venta?",
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Sí, detallado',
    cancelButtonText: 'No, solo resumen',
    confirmButtonColor: '#10b981'
  });

  const filtros = {
    fechaInicio: document.getElementById("fechaInicio").value,
    fechaFin: document.getElementById("fechaFin").value,
    estado: document.getElementById("filtroEstado").value,
    conDetalles: conDetalles
  };

  const res = await apiPost("ventas/full", filtros);
  if (!res.success) return;

  const wb = XLSX.utils.book_new();
  const dataRows = [];
  
  dataRows.push(["Folio", "Cliente", "Vendedor", "Total", "Pagado", "Saldo", "Método", "Fecha", "Estado"]);

  res.data.forEach(v => {
    dataRows.push([v.folio, v.cliente_nombre, v.vendedor_nombre, Number(v.total), Number(v.monto_pagado), Number(v.saldo), v.metodo_pago, v.fecha_venta, v.estado]);
    if (conDetalles && v.detalles) {
        v.detalles.forEach(d => {
            dataRows.push(["", "   ↳ " + d.producto_nombre, "", "", "", "", d.cantidad, Number(d.precio_unitario), Number(d.subtotal)]);
        });
    }
  });

  const ws = XLSX.utils.aoa_to_sheet(dataRows);
  XLSX.utils.book_append_sheet(wb, ws, "Reporte_Ventas");
  XLSX.writeFile(wb, `Ventas_${filtros.fechaInicio}_${conDetalles ? 'Detallado' : 'Resumen'}.xlsx`);
}

async function exportarPDF() {
  const { isConfirmed: conDetalles } = await Swal.fire({
    title: 'Exportar PDF',
    text: "¿Deseas incluir el detalle de productos en el PDF?",
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Sí, detallado',
    cancelButtonText: 'No, solo resumen'
  });

  const filtros = {
    fechaInicio: document.getElementById("fechaInicio").value,
    fechaFin: document.getElementById("fechaFin").value,
    estado: document.getElementById("filtroEstado").value,
    conDetalles: conDetalles
  };

  const res = await apiPost("ventas/full", filtros);
  if (!res.success) return;

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  
  doc.setFontSize(16);
  doc.text("Reporte de Ventas " + (conDetalles ? "(Detallado)" : "(Resumen)"), 105, 15, { align: "center" });
  doc.setFontSize(10);
  doc.text(`Periodo: ${filtros.fechaInicio} a ${filtros.fechaFin}`, 105, 22, { align: "center" });

  const tableBody = [];
  res.data.forEach(v => {
    tableBody.push([v.folio, v.cliente_nombre, formatCurrency(v.total), formatDate(v.fecha_venta), v.estado]);
    if (conDetalles && v.detalles) {
        v.detalles.forEach(d => {
            tableBody.push(["", { content: `↳ ${d.producto_nombre} (x${d.cantidad})`, styles: { fontStyle: 'italic', textColor: [100, 100, 100] } }, "", formatCurrency(d.subtotal), ""]);
        });
    }
  });

  doc.autoTable({
    startY: 30,
    head: [['Folio', 'Cliente / Productos', 'Total', 'Fecha', 'Estado']],
    body: tableBody,
    theme: conDetalles ? 'plain' : 'striped',
    headStyles: { fillColor: [41, 128, 185] },
    didParseCell: function(data) {
        if (data.row.cells[0].text === "" && conDetalles) {
            data.cell.styles.fillColor = [250, 250, 250];
        }
    }
  });

  doc.save(`Reporte_Ventas_${filtros.fechaInicio}.pdf`);
}
