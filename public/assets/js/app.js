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

function showLoading() {
  Swal.fire({ title: "Cargando...", allowOutsideClick: false, didOpen: () => Swal.showLoading() });
}

function hideLoading() {
  Swal.close();
}
