// =========================
// CONFIGURACIÓN GLOBAL
// =========================
window.APP_CONFIG = {
  API: "/PV_Witmac/app/api/api.php",
};



// =========================
// FUNCIÓN API GLOBAL
// =========================
async function apiPost(endpoint, data = {}) {
  try {
    const res = await fetch(
      `${window.APP_CONFIG.API}/${endpoint}`, 
      {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
      }
    );

    const json = await res.json();

    if (!res.ok || json.error) {
      throw new Error(json.error || "Error en la API");
    }

    return json;
  } catch (error) {
    throw error;
  }
}

