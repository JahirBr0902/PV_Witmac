// =========================
// CONFIGURACIÓN GLOBAL
// =========================
window.APP_CONFIG = {
  API: "/PV_Witmac/app/api/api.php",
};

// =========================
// NÚCLEO API (Centralizado)
// =========================
async function apiPost(endpoint, data = {}, options = {}) {
  const { 
    showLoader = true, 
    showAlerts = true,
    successMsg = null 
  } = options;

  try {
    if (showLoader) showLoading();

    const res = await fetch(`${window.APP_CONFIG.API}/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    // Manejo de Sesión Expirada (Error 401)
    if (res.status === 401) {
      if (showLoader) hideLoading();
      await Swal.fire({
        title: "Sesión Expirada",
        text: "Tu sesión ha caducado por inactividad. Por favor, inicia sesión de nuevo.",
        icon: "warning",
        confirmButtonText: "Ir al Login",
        allowOutsideClick: false
      });
      window.location.href = "login.php";
      return null;
    }

    const json = await res.json();
    if (showLoader) hideLoading();

    if (!res.ok || json.error) {
      throw new Error(json.error || "Error en el servidor");
    }

    if (successMsg && showAlerts) {
      notify("Éxito", successMsg, "success");
    }

    return json;
  } catch (error) {
    if (showLoader) hideLoading();
    if (showAlerts) notify("Error", error.message, "error");
    throw error;
  }
}

// =========================
// UTILIDADES DE UI
// =========================

// Llenado genérico de tablas
function fillTable(containerId, data, columns, emptyMsg = "No hay registros") {
  const tbody = document.getElementById(containerId);
  if (!tbody) return;

  if (!Array.isArray(data) || data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="${columns.length}" class="text-center text-muted py-4">${emptyMsg}</td></tr>`;
    return;
  }

  tbody.innerHTML = data.map(item => {
    const row = columns.map(col => {
      const content = typeof col.render === 'function' 
        ? col.render(item) 
        : (item[col.field] ?? '-');
      return `<td>${content}</td>`;
    }).join('');
    return `<tr>${row}</tr>`;
  }).join('');
}

// Notificaciones rápidas
function notify(title, text, icon = "success", timer = 2000) {
  return Swal.fire({ title, text, icon, timer, showConfirmButton: icon === 'error' });
}

// Confirmaciones rápidas
async function confirmAction(title, text, confirmText = "Sí, continuar") {
  const res = await Swal.fire({
    title, text, icon: "warning",
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: "Cancelar"
  });
  return res.isConfirmed;
}

// Formateadores
const formatCurrency = (n) => "$" + parseFloat(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 });
const formatDate = (d) => d ? new Date(d).toLocaleDateString("es-MX") : "-";
const formatDateTime = (d) => d ? new Date(d).toLocaleString("es-MX") : "-";

// ── CONSTANTES ───────────────────────────────────────────────────────────────
// Courier 8pt en jsPDF: ~1 carácter = 2.1mm → 72mm útiles ≈ 34 chars seguros
const TICKET = {
    ancho:    76,   // ← antes 80. El navegador añade ~4mm de margen interno al renderizar
    x:        3,    // ← antes 4
    centroX:  38,   // ← antes 40
    COLS:     34,
    lineaH:   4.2,
};

// Rellena/trunca un string a N caracteres exactos
const pad  = (s, n, dir = "L") => {
    const str = String(s ?? "").substring(0, n);
    return dir === "R"
        ? str.padStart(n, " ")
        : str.padEnd(n, " ");
};

// ── HELPERS ──────────────────────────────────────────────────────────────────

function dibujarLinea(doc, y) {
    doc.setDrawColor(150);
    doc.setLineWidth(0.2);
    doc.line(TICKET.x, y, TICKET.x + (TICKET.COLS * 2.1), y);
    return y + 3;
}

function calcularAlto(v, conf) {
    let lineas = 18;
    if (conf.rfc)            lineas += 1;
    if (conf.direccion)      lineas += 2;
    if (conf.telefono)       lineas += 1;
    lineas += 5;
    lineas += (v.detalles?.length ?? 0) * 2.2;
    lineas += 6;
    if (parseFloat(v.descuento) > 0) lineas += 1;
    if (parseFloat(v.saldo)     > 0) lineas += 1;
    if (conf.mensaje_ticket)         lineas += 3;
    lineas += 4;
    return Math.max(160, lineas * TICKET.lineaH + 20);
}

// ── SECCIONES ────────────────────────────────────────────────────────────────

function dibujarEncabezado(doc, conf, y) {
    doc.setFont("courier", "bold");
    doc.setFontSize(11);
    doc.text(conf.nombre_negocio.toUpperCase(), TICKET.centroX, y, { align: "center" });
    y += TICKET.lineaH + 1;

    doc.setFont("courier", "normal");
    doc.setFontSize(8);

    if (conf.rfc) {
        doc.text(`RFC: ${conf.rfc}`, TICKET.centroX, y, { align: "center" });
        y += TICKET.lineaH;
    }
    if (conf.direccion) {
        const lineas = doc.splitTextToSize(conf.direccion, 60);
        doc.text(lineas, TICKET.centroX, y, { align: "center" });
        y += lineas.length * TICKET.lineaH;
    }
    if (conf.telefono) {
        doc.text(`TEL: ${conf.telefono}`, TICKET.centroX, y, { align: "center" });
        y += TICKET.lineaH;
    }

    y += 1;
    return dibujarLinea(doc, y);
}

function dibujarDatosVenta(doc, v, y) {
    doc.setFontSize(8);
    const maxVal = 20;

    const rows = [
        ["FOLIO",   v.folio],
        ["FECHA",   formatDateTime(v.fecha_venta)],
        ["CAJERO",  v.vendedor_nombre],
        ["CLIENTE", v.cliente_nombre],
    ];

    rows.forEach(([label, val]) => {
        // "FOLIO:  " = 8 chars fijos, valor truncado al resto
        const linea = `${pad(label + ":", 8)} ${String(val ?? "-").substring(0, maxVal)}`;
        doc.setFont("courier", "bold");
        doc.text(linea, TICKET.x, y);
        y += TICKET.lineaH;
    });

    y += 1;
    return dibujarLinea(doc, y);
}

function dibujarDetalle(doc, detalles, y) {
    // Layout fijo en 34 columnas:
    // [cant 4] [nombre 16] [precio 7R] [subt 7R] = 34 chars exactos
    const C = { cant: 4, nombre: 16, precio: 7, subt: 7 };

    const fila = (cant, nombre, precio, subt, bold = false) => {
        doc.setFont("courier", bold ? "bold" : "normal");
        const linea =
            pad(cant,   C.cant)   +
            pad(nombre, C.nombre) +
            pad(precio, C.precio, "R") +
            pad(subt,   C.subt,   "R");
        doc.text(linea, TICKET.x, y);
        y += TICKET.lineaH;
        return y;
    };

    doc.setFontSize(7.5);

    // Encabezado
    y = fila("CANT", "PRODUCTO", "P.UNIT", "SUBT", true);
    y = dibujarLinea(doc, y);

    // Productos
    detalles.forEach((d) => {
        const nombreCompleto = d.producto_nombre ?? "Sin nombre";
        const precio = formatCurrency(d.precio_unitario);
        const subt   = formatCurrency(d.subtotal);

        // Primera línea con datos numéricos
        const nombre1 = nombreCompleto.substring(0, C.nombre);
        y = fila(String(d.cantidad), nombre1, precio, subt);

        // Segunda línea si el nombre no cabe
        if (nombreCompleto.length > C.nombre) {
            const nombre2 = nombreCompleto.substring(C.nombre, C.nombre * 2);
            doc.setFont("courier", "normal");
            doc.text(pad("", C.cant) + nombre2, TICKET.x, y);
            y += TICKET.lineaH;
        }
    });

    y += 1;
    return dibujarLinea(doc, y);
}

function dibujarTotales(doc, v, y) {
    // Layout: [label 16R] [valor 10R] → siempre dentro de 34 chars
    const fila = (label, valor, bold = false, fontSize = 8) => {
        doc.setFontSize(fontSize);
        doc.setFont("courier", bold ? "bold" : "normal");
        const linea = pad(label, 20, "R") + pad(valor, 14, "R");
        doc.text(linea, TICKET.x, y);
        y += TICKET.lineaH;
    };

    doc.setFontSize(8);
    fila("SUBTOTAL:", formatCurrency(v.subtotal));

    if (parseFloat(v.descuento) > 0) {
        fila("DESCUENTO:", `-${formatCurrency(v.descuento)}`);
    }

    y += 1;
    y = dibujarLinea(doc, y);
    fila("TOTAL:", formatCurrency(v.total), true, 10);
    y += 1;
    y = dibujarLinea(doc, y);

    // Pago
    doc.setFontSize(8);
    doc.setFont("courier", "normal");
    doc.text(`MÉTODO:  ${(v.metodo_pago ?? "").toUpperCase()}`, TICKET.x, y);
    y += TICKET.lineaH;
    doc.text(`PAGADO:  ${formatCurrency(v.monto_pagado)}`, TICKET.x, y);
    y += TICKET.lineaH;

    // Calcular y mostrar cambio si aplica
    const cambio = parseFloat(v.monto_pagado) - parseFloat(v.total);
    if (cambio > 0) {
        doc.setFont("courier", "bold");
        doc.text(`CAMBIO:  ${formatCurrency(cambio)}`, TICKET.x, y);
        y += TICKET.lineaH;
    }

    if (parseFloat(v.saldo) > 0) {
        doc.setFont("courier", "bold");
        doc.text(`SALDO PENDIENTE: ${formatCurrency(v.saldo)}`, TICKET.x, y);
        y += TICKET.lineaH + 1;
    }

    return y;
}

function dibujarPie(doc, conf, y) {
    y += 3;
    y = dibujarLinea(doc, y);

    doc.setFontSize(7.5);

    if (conf.mensaje_ticket) {
        doc.setFont("courier", "normal");
        const lineas = doc.splitTextToSize(conf.mensaje_ticket, 60);
        doc.text(lineas, TICKET.centroX, y, { align: "center" });
        y += lineas.length * TICKET.lineaH + 2;
    }

    doc.setFont("courier", "bold");
    doc.text("*** GRACIAS POR SU COMPRA ***", TICKET.centroX, y, { align: "center" });
    y += TICKET.lineaH;
    doc.setFont("courier", "normal");
    doc.text("** COPIA PARA EL CLIENTE **", TICKET.centroX, y, { align: "center" });

    return y + TICKET.lineaH;
}

// ── FUNCIÓN PRINCIPAL ────────────────────────────────────────────────────────

async function imprimirTicketVenta(ventaId) {
    try {
        const v    = await apiPost("ventas/listar", { id: ventaId }, { showLoader: false });
        const conf = window.BUSINESS_CONFIG || { nombre_negocio: "Punto de Venta" };

        if (!v) {
            notify("Aviso", "No se encontró la venta", "warning");
            return;
        }
        if (!Array.isArray(v.detalles) || v.detalles.length === 0) {
            notify("Aviso", "La venta no tiene productos", "warning");
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({
            unit:   "mm",
            format: [TICKET.ancho, calcularAlto(v, conf)],
        });

        let y = 8;
        y = dibujarEncabezado(doc, conf, y);
        y = dibujarDatosVenta(doc, v, y);
        y = dibujarDetalle(doc, v.detalles, y);
        y = dibujarTotales(doc, v, y);
            dibujarPie(doc, conf, y);

        doc.autoPrint();
        window.open(doc.output("bloburl"), "_blank");

    } catch (error) {
        console.error("Error al generar ticket:", error);
        notify("Error", "No se pudo generar el ticket", "error");
    }
}



function showLoading() {
  Swal.fire({ title: "Cargando...", allowOutsideClick: false, didOpen: () => Swal.showLoading() });
}

function hideLoading() {
  if (Swal.isVisible() && Swal.isLoading()) {
    Swal.close();
  }
}
