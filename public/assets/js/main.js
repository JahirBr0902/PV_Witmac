// Variables globales
let currentPage = "dashboard";
let cart = [];

// Inicialización
document.addEventListener("DOMContentLoaded", function () {
  initNavigation();
  initLogout();
  checkEstadoCaja();
  loadPage("dashboard");
});

// Navegación
function initNavigation() {
  const navLinks = document.querySelectorAll("[data-page]");
  navLinks.forEach((link) => {
    link.addEventListener("click", function (e) {
      e.preventDefault();
      loadPage(this.dataset.page);
    });
  });
}

function setActiveLink(page) {
  const navLinks = document.querySelectorAll("[data-page]");
  navLinks.forEach((l) => {
    l.classList.remove("active");
    const dropdownToggle = l.closest('.dropdown')?.querySelector('.dropdown-toggle');
    if (dropdownToggle) dropdownToggle.classList.remove("active");
  });
  
  const target = document.querySelector(`[data-page="${page}"]`);
  if (target) {
    target.classList.add("active");
    const parentToggle = target.closest('.dropdown')?.querySelector('.dropdown-toggle');
    if (parentToggle) parentToggle.classList.add("active");
  }
}

// Cerrar sesión
function initLogout() {
  const btnLogout = document.getElementById("btnLogout");
  if (!btnLogout) return;

  btnLogout.addEventListener("click", async function () {
    const result = await Swal.fire({
      title: "¿Cerrar sesión?",
      text: "¿Estás seguro de que deseas cerrar sesión?",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Sí, salir",
      cancelButtonText: "Cancelar",
    });

    if (result.isConfirmed) {
      try {
        const data = await apiPost("session/logout");

        if (data.success) {
          window.location.href = "login.php";
        }
      } catch (error) {
        console.error("Error al cerrar sesión:", error);
      }
    }
  });
}

// Cargar página (Router simple)
function loadPage(page) {
  currentPage = page;
  setActiveLink(page);
  
  switch (page) {
    case "dashboard":
      loadDashboard();
      break;
    case "ventas":
      loadVentas();
      break;
    case "productos":
      loadProductos();
      break;
    case "clientes":
      loadClientes();
      break;
    case "creditos":
      loadCreditos();
      break;
    case "reportes":
      loadReportes();
      break;
    case "usuarios":
      loadUsuarios();
      break;
    case "inventario":
      loadInventario();
      break;
    case "cortes":
      loadCortes();
      break;
  }
}
