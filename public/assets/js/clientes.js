// ========== MÓDULO DE CLIENTES (Simplificado) ==========

async function loadClientes() {
  document.getElementById("pageContent").innerHTML = `
    <div class="fade-in">
        <div class="d-flex justify-content-between align-items-center mb-4">
            <h2><i class="bi bi-people"></i> Clientes</h2>
            <button class="btn btn-primary" onclick="showClienteModal()">
                <i class="bi bi-plus-circle"></i> Nuevo Cliente
            </button>
        </div>
        <div class="card"><div class="card-body"><div class="table-responsive">
            <table class="table table-hover">
                <thead><tr><th>Nombre</th><th>Teléfono</th><th>Acciones</th></tr></thead>
                <tbody id="clientesTableBody"></tbody>
            </table>
        </div></div></div>
    </div>
    <div class="modal fade" id="clienteModal" tabindex="-1"><div class="modal-dialog"><div class="modal-content">
        <div class="modal-header"><h5 class="modal-title" id="clienteModalTitle">Nuevo Cliente</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
        <div class="modal-body"><form id="clienteForm">
            <input type="hidden" id="clienteId">
            <div class="mb-3"><label class="form-label">Nombre *</label><input type="text" class="form-control" id="clienteNombre" required></div>
            <div class="mb-3"><label class="form-label">Teléfono</label><input type="tel" class="form-control" id="clienteTelefono"></div>
        </form></div>
        <div class="modal-footer"><button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button><button type="button" class="btn btn-primary" onclick="saveCliente()">Guardar</button></div>
    </div></div></div>`;

  await loadClientesTable();
}

async function loadClientesTable() {
  const data = await apiPost("clientes/listar", {}, { showLoader: false });
  fillTable("clientesTableBody", data, [
    { field: "nombre" },
    { field: "telefono" },
    {
      render: (c) => `
        <button class="btn btn-sm btn-warning" onclick='editCliente(${JSON.stringify(c)})'><i class="bi bi-pencil"></i></button>
        <button class="btn btn-sm btn-${c.activo ? "success" : "danger"}" onclick="toggleClienteEstado(${c.id}, ${!c.activo})">
          <i class="bi bi-${c.activo ? "check" : "x"}-circle"></i>
        </button>`
    }
  ]);
}

function showClienteModal() {
  document.getElementById("clienteModalTitle").textContent = "Nuevo Cliente";
  document.getElementById("clienteForm").reset();
  document.getElementById("clienteId").value = "";
  new bootstrap.Modal(document.getElementById("clienteModal")).show();
}

function editCliente(c) {
  showClienteModal();
  document.getElementById("clienteModalTitle").textContent = "Editar Cliente";
  document.getElementById("clienteId").value = c.id;
  document.getElementById("clienteNombre").value = c.nombre;
  document.getElementById("clienteTelefono").value = c.telefono || "";
}

async function saveCliente() {
  const id = document.getElementById("clienteId").value;
  const data = {
    nombre: document.getElementById("clienteNombre").value,
    telefono: document.getElementById("clienteTelefono").value,
    id: id || undefined
  };

  const action = id ? "editar" : "nuevo";
  await apiPost(`clientes/${action}`, data, { successMsg: "Cliente guardado" });
  bootstrap.Modal.getInstance(document.getElementById("clienteModal")).hide();
  loadClientesTable();
}

async function toggleClienteEstado(id, nuevoEstado) {
  const texto = nuevoEstado ? "activar" : "desactivar";
  if (!await confirmAction(`¿Deseas ${texto} este cliente?`)) return;

  await apiPost("clientes/estatus", { id, activo: nuevoEstado }, { successMsg: "Estado actualizado" });
  loadClientesTable();
}
