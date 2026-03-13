// ========== MÓDULO DE REPORTES (Simplificado y Corregido) ==========

async function loadReportes() {
  const hoy = new Date().toISOString().split("T")[0];
  const hace7Dias = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  document.getElementById("pageContent").innerHTML = `
    <div class="fade-in">
        <h2 class="mb-4"><i class="bi bi-graph-up"></i> Reportes de Ventas</h2>

        <div class="card mb-4"><div class="card-body">
            <div class="row g-3 align-items-end">
                <div class="col-md-2"><label class="form-label">Folio</label><input type="text" class="form-control" id="filtroFolio" placeholder="V-2024..."></div>
                <div class="col-md-2"><label class="form-label">Desde</label><input type="date" class="form-control" id="fechaInicio" value="${hace7Dias}"></div>
                <div class="col-md-2"><label class="form-label">Hasta</label><input type="date" class="form-control" id="fechaFin" value="${hoy}"></div>
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
    </div></div></div>`;

    await loadVentasReporte();

    // Agregar evento Enter para búsqueda por folio
    document.getElementById("filtroFolio").addEventListener("keypress", function(e) {
        if (e.key === 'Enter') {
            loadVentasReporte();
        }
    });
}

async function loadVentasReporte() {
  const filtros = {
    folio: document.getElementById("filtroFolio").value,
    fechaInicio: document.getElementById("fechaInicio").value,
    fechaFin: document.getElementById("fechaFin").value,
    estado: document.getElementById("filtroEstado").value
  };

  const data = await apiPost("ventas/listar", filtros);
  const user = await apiPost("session/info", {});
  const ahora = new Date();

  fillTable("ventasReporteBody", data, [
    { render: (v) => `<strong>${v.folio}</strong>` },
    { field: "cliente_nombre" },
    { field: "vendedor_nombre" },
    { render: (v) => `<div>${formatCurrency(v.total)}</div>${v.saldo > 0 ? `<small class="text-warning">Saldo: ${formatCurrency(v.saldo)}</small>` : ""}` },
    { render: (v) => `<span class="badge bg-info">${v.metodo_pago}</span>` },
    { render: (v) => formatDateTime(v.fecha_venta) },
    { render: (v) => `<span class="badge bg-${v.estado === 'completada' ? 'success' : (v.estado === 'cancelada' ? 'danger' : 'warning')}">${v.estado}</span>` },
    { render: (v) => {
        const fechaVenta = new Date(v.fecha_venta);
        const diffMinutos = (ahora - fechaVenta) / (1000 * 60);
        const puedeAlterar = user.rol === 'admin' && diffMinutos <= 15 && v.estado !== 'cancelada';

        return `
        <div class="btn-group">
            <button class="btn btn-sm btn-outline-secondary" onclick="imprimirTicketVenta(${v.id})" title="Imprimir Ticket"><i class="bi bi-printer"></i></button>
            <button class="btn btn-sm btn-info" onclick="verDetalleVenta(${v.id})" title="Ver detalle"><i class="bi bi-eye"></i></button>
            ${puedeAlterar ? `
                <button class="btn btn-sm btn-warning" onclick="prepararEdicionVenta(${v.id})" title="Editar (Límite 15min)"><i class="bi bi-pencil"></i></button>
                <button class="btn btn-sm btn-danger" onclick="confirmarCancelacionVenta(${v.id}, '${v.folio}')" title="Cancelar (Límite 15min)"><i class="bi bi-trash"></i></button>
            ` : ''}
        </div>
    `} }
  ]);
}

async function confirmarCancelacionVenta(id, folio) {
    const { isConfirmed } = await Swal.fire({
        title: '¿Cancelar venta?',
        text: `Se cancelará la venta ${folio} y los productos regresarán al inventario. Esta acción no se puede deshacer.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, cancelar',
        cancelButtonText: 'No, mantener',
        confirmButtonColor: '#d33'
    });

    if (isConfirmed) {
        const res = await apiPost("ventas/cancelar", { id });
        if (res.success) {
            Swal.fire('Cancelada', res.message, 'success');
            loadVentasReporte();
        }
    }
}

async function prepararEdicionVenta(id) {
    const { isConfirmed } = await Swal.fire({
        title: 'Editar Venta',
        text: "Se cargarán los datos de esta venta en el módulo de ventas. Al guardar, se reemplazará la venta anterior y se ajustará el inventario.",
        icon: 'info',
        showCancelButton: true,
        confirmButtonText: 'Ir a editar',
        cancelButtonColor: '#3085d6'
    });

    if (isConfirmed) {
        // Guardamos en sessionStorage para que el módulo de ventas sepa que es edición
        sessionStorage.setItem('editandoVentaId', id);
        // Cambiamos a la página de ventas
        document.querySelector('[data-page="ventas"]').click();
    }
}

async function verDetalleVenta(ventaId) {
  // Desactivamos el loader global para evitar conflictos con el modal y cambios de scrollbar
  const v = await apiPost("ventas/listar", { id: ventaId }, { showLoader: false });
  
  if (!v) return;

  let html = `
    <div class="row mb-3">
      <div class="col-6">
        <p><strong>Folio:</strong> ${v.folio}<br><strong>Cliente:</strong> ${v.cliente_nombre}<br><strong>Fecha:</strong> ${formatDateTime(v.fecha_venta)}</p>
      </div>
      <div class="col-6 text-end">
        <p><strong>Vendedor:</strong> ${v.vendedor_nombre}<br><strong>Método:</strong> ${v.metodo_pago}<br><strong>Estado:</strong> ${v.estado}</p>
      </div>
    </div>
    <div class="table-responsive">
        <table class="table table-sm">
          <thead class="table-light"><tr><th>Producto</th><th>Precio</th><th>Cant.</th><th>Subtotal</th></tr></thead>
          <tbody>
            ${v.detalles.map(d => `<tr><td>${d.producto_nombre}</td><td>${formatCurrency(d.precio_unitario)}</td><td>${d.cantidad}</td><td>${formatCurrency(d.subtotal)}</td></tr>`).join('')}
          </tbody>
        </table>
    </div>
    <div class="row mt-3"><div class="col-6 offset-6 text-end">
        <p>Subtotal: ${formatCurrency(v.subtotal)}<br>Descuento: -${formatCurrency(v.descuento)}<br><h4>Total: ${formatCurrency(v.total)}</h4>
        <span class="text-primary">Pagado: ${formatCurrency(v.monto_pagado)}</span> / <span class="text-warning">Saldo: ${formatCurrency(v.saldo)}</span></p>
    </div></div>`;

  const modalEl = document.getElementById("detalleVentaModal");
  document.getElementById("detalleVentaContent").innerHTML = html;
  
  // Usamos getOrCreateInstance para no crear múltiples objetos de control sobre el mismo DOM
  const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
  modal.show();
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
    folio: document.getElementById("filtroFolio").value,
    fechaInicio: document.getElementById("fechaInicio").value,
    fechaFin: document.getElementById("fechaFin").value,
    estado: document.getElementById("filtroEstado").value,
    conDetalles: conDetalles
  };

  const res = await apiPost("ventas/full", filtros);
  if (!res.success) return;

  const wb = XLSX.utils.book_new();
  const dataRows = [];
  
  // Encabezados claros
  dataRows.push(["Folio", "Cliente", "Vendedor", "Total Venta", "Monto Pagado", "Saldo Pendiente", "Método", "Fecha", "Estado"]);

  res.data.forEach(v => {
    dataRows.push([
        v.folio, 
        v.cliente_nombre, 
        v.vendedor_nombre, 
        Number(v.total), 
        Number(v.monto_pagado), 
        Number(v.saldo), 
        v.metodo_pago, 
        v.fecha_venta, 
        v.estado
    ]);
    
    if (conDetalles && v.detalles) {
        v.detalles.forEach(d => {
            // Fila de detalle (dejamos vacíos los campos de totales para que no se sumen erróneamente)
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
    folio: document.getElementById("filtroFolio").value,
    fechaInicio: document.getElementById("fechaInicio").value,
    fechaFin: document.getElementById("fechaFin").value,
    estado: document.getElementById("filtroEstado").value,
    conDetalles: conDetalles
  };

  const res = await apiPost("ventas/full", filtros);
  if (!res.success) return;

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF('landscape'); // Cambiamos a horizontal para que quepan más columnas
  
  doc.setFontSize(16);
  doc.text("Reporte de Ventas " + (conDetalles ? "(Detallado)" : "(Resumen)"), 148, 15, { align: "center" });
  doc.setFontSize(10);
  doc.text(`Periodo: ${filtros.fechaInicio} a ${filtros.fechaFin}`, 148, 22, { align: "center" });

  const tableBody = [];
  res.data.forEach(v => {
    // Fila principal con Pagado y Saldo
    tableBody.push([
        v.folio, 
        v.cliente_nombre, 
        formatCurrency(v.total), 
        formatCurrency(v.monto_pagado), 
        formatCurrency(v.saldo), 
        formatDateTime(v.fecha_venta), 
        v.estado.toUpperCase()
    ]);
    
    if (conDetalles && v.detalles) {
        v.detalles.forEach(d => {
            tableBody.push([
                "", 
                { content: `> ${d.producto_nombre} (x${d.cantidad})`, styles: { fontStyle: 'italic', textColor: [80, 80, 80] } }, 
                "", 
                "", 
                "", 
                formatCurrency(d.subtotal), 
                ""
            ]);
        });
    }
  });

  doc.autoTable({
    startY: 30,
    head: [['Folio', 'Cliente / Productos', 'Total', 'Pagado', 'Saldo', 'Fecha', 'Estado']],
    body: tableBody,
    theme: conDetalles ? 'plain' : 'striped',
    headStyles: { fillColor: [41, 128, 185], fontSize: 9 },
    columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 25 },
        3: { cellWidth: 25 },
        4: { cellWidth: 25 },
        5: { cellWidth: 40 },
        6: { cellWidth: 25 }
    },
    didParseCell: function(data) {
        if (data.row.cells[0].text === "" && conDetalles) {
            data.cell.styles.fillColor = [250, 250, 250];
        }
    }
  });

  doc.save(`Reporte_Ventas_${filtros.fechaInicio}.pdf`);
}
