// ========== MÓDULO DE USUARIOS (Simplificado) ==========

async function loadUsuarios() {
  document.getElementById("pageContent").innerHTML = `
    <div class="fade-in">
        <div class="d-flex justify-content-between align-items-center mb-4">
            <h2><i class="bi bi-person-badge"></i> Usuarios</h2>
            <button class="btn btn-primary" onclick="showUsuarioModal()"><i class="bi bi-plus-circle"></i> Nuevo</button>
        </div>
        <div class="card"><div class="card-body"><div class="table-responsive">
            <table class="table table-hover">
                <thead><tr><th>Nombre</th><th>Email</th><th>Rol</th><th>Acciones</th></tr></thead>
                <tbody id="usuariosTableBody"></tbody>
            </table>
        </div></div></div>
    </div>
    <div class="modal fade" id="usuarioModal" tabindex="-1"><div class="modal-dialog"><div class="modal-content">
        <div class="modal-header"><h5 id="modalTitle">Usuario</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
        <div class="modal-body"><form id="usuarioForm">
            <input type="hidden" id="usuarioId">
            <div class="mb-3"><label class="form-label">Nombre *</label><input type="text" class="form-control" id="usuarioNombre" required></div>
            <div class="mb-3"><label class="form-label">Email *</label><input type="email" class="form-control" id="usuarioEmail" required></div>
            <div class="mb-3">
                <label class="form-label" id="passwordLabel">Contraseña *</label>
                <input type="password" class="form-control" id="usuarioPassword">
                <small class="text-muted d-none" id="passwordHelp">Deja en blanco para mantener la contraseña actual.</small>
            </div>
            <div class="mb-3"><label class="form-label">Rol *</label><select class="form-select" id="usuarioRol"><option value="vendedor">Vendedor</option><option value="admin">Administrador</option></select></div>
        </form></div>
        <div class="modal-footer"><button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button><button type="button" class="btn btn-primary" onclick="saveUsuario()">Guardar</button></div>
    </div></div></div>`;

  await loadUsuariosTable();
}

async function loadUsuariosTable() {
  const data = await apiPost("usuarios/listar", {}, { showLoader: false });
  fillTable("usuariosTableBody", data, [
    { field: "nombre" },
    { field: "email" },
    { render: (u) => `<span class="badge bg-${u.rol === "admin" ? "danger" : "primary"}">${u.rol}</span>` },
    {
      render: (u) => `
        <button class="btn btn-sm btn-warning" onclick='editUsuario(${JSON.stringify(u)})'><i class="bi bi-pencil"></i></button>
        <button class="btn btn-sm btn-${u.activo ? "success" : "danger"}" onclick="toggleUsuarioEstado(${u.id}, ${!u.activo})"><i class="bi bi-${u.activo ? "check" : "x"}-circle"></i></button>`
    }
  ]);
}

function showUsuarioModal() {
  document.getElementById("usuarioForm").reset();
  document.getElementById("usuarioId").value = "";
  document.getElementById("modalTitle").textContent = "Nuevo Usuario";
  document.getElementById("passwordLabel").textContent = "Contraseña *";
  document.getElementById("usuarioPassword").required = true;
  document.getElementById("passwordHelp").classList.add("d-none");
  new bootstrap.Modal(document.getElementById("usuarioModal")).show();
}

function editUsuario(u) {
  showUsuarioModal();
  document.getElementById("modalTitle").textContent = "Editar Usuario";
  document.getElementById("usuarioId").value = u.id;
  document.getElementById("usuarioNombre").value = u.nombre;
  document.getElementById("usuarioEmail").value = u.email;
  document.getElementById("usuarioRol").value = u.rol;
  
  // Ajustes para contraseña opcional
  document.getElementById("passwordLabel").textContent = "Cambiar Contraseña";
  document.getElementById("usuarioPassword").required = false;
  document.getElementById("passwordHelp").classList.remove("d-none");
}

async function saveUsuario() {
  const id = document.getElementById("usuarioId").value;
  const password = document.getElementById("usuarioPassword").value;

  const data = {
    id: id || undefined,
    nombre: document.getElementById("usuarioNombre").value,
    email: document.getElementById("usuarioEmail").value,
    rol: document.getElementById("usuarioRol").value
  };

  // Solo incluimos la contraseña si tiene contenido
  if (password.trim() !== "") {
    data.password = password;
  } else if (!id) {
    return notify("Error", "La contraseña es obligatoria para nuevos usuarios", "error");
  }

  await apiPost(`usuarios/${id ? "editar" : "nuevo"}`, data, { successMsg: "Usuario guardado" });
  bootstrap.Modal.getInstance(document.getElementById("usuarioModal")).hide();
  loadUsuariosTable();
}

async function toggleUsuarioEstado(id, nuevoEstado) {
  if (!await confirmAction(`¿Deseas ${nuevoEstado ? "activar" : "desactivar"} este usuario?`)) return;
  await apiPost("usuarios/estatus", { id, activo: nuevoEstado }, { successMsg: "Estado actualizado" });
  loadUsuariosTable();
}
