// ========== MÓDULO DE CONFIGURACIÓN DEL NEGOCIO ==========

async function loadConfiguracion() {
    const content = document.getElementById('pageContent');
    content.innerHTML = `
        <div class="fade-in">
            <h2 class="mb-4"><i class="bi bi-gear-fill"></i> Configuración del Sistema</h2>
            
            <div class="row">
                <div class="col-md-8">
                    <div class="card shadow-sm">
                        <div class="card-header bg-white fw-bold">
                            <i class="bi bi-shop"></i> Datos de la Empresa / Negocio
                        </div>
                        <div class="card-body">
                            <form id="configForm">
                                <div class="row g-3">
                                    <div class="col-md-12">
                                        <label class="form-label fw-bold">Nombre del Negocio</label>
                                        <input type="text" class="form-control" id="conf_nombre" name="nombre_negocio" required>
                                        <small class="text-muted">Aparecerá en la cabecera de los tickets.</small>
                                    </div>
                                    
                                    <div class="col-md-6">
                                        <label class="form-label fw-bold">RFC / Identificación Fiscal</label>
                                        <input type="text" class="form-control" id="conf_rfc" name="rfc">
                                    </div>
                                    
                                    <div class="col-md-6">
                                        <label class="form-label fw-bold">Teléfono de Contacto</label>
                                        <input type="text" class="form-control" id="conf_telefono" name="telefono">
                                    </div>
                                    
                                    <div class="col-md-12">
                                        <label class="form-label fw-bold">Correo Electrónico</label>
                                        <input type="email" class="form-control" id="conf_email" name="email">
                                    </div>
                                    
                                    <div class="col-md-12">
                                        <label class="form-label fw-bold">Dirección Física</label>
                                        <textarea class="form-control" id="conf_direccion" name="direccion" rows="2"></textarea>
                                    </div>
                                    
                                    <div class="col-md-12">
                                        <label class="form-label fw-bold">Mensaje al pie del Ticket</label>
                                        <textarea class="form-control" id="conf_mensaje" name="mensaje_ticket" rows="2"></textarea>
                                        <small class="text-muted">Ej: "¡Gracias por su preferencia!", "No hay devoluciones".</small>
                                    </div>
                                </div>
                                
                                <div class="mt-4 border-top pt-3 text-end">
                                    <button type="submit" class="btn btn-primary px-5">
                                        <i class="bi bi-save"></i> Guardar Cambios
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
                
                <div class="col-md-4">
                    <div class="card shadow-sm bg-light">
                        <div class="card-body">
                            <h6><i class="bi bi-info-circle"></i> Ayuda</h6>
                            <p class="small text-muted">
                                Los datos configurados en esta sección se utilizarán para:
                            </p>
                            <ul class="small text-muted">
                                <li>Encabezados de Tickets de venta.</li>
                                <li>Comprobantes de abonos.</li>
                                <li>Reportes PDF generados por el sistema.</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Cargar datos actuales
    try {
        const res = await apiPost('configuracion/get');
        if (res.success && res.data) {
            const d = res.data;
            document.getElementById('conf_nombre').value = d.nombre_negocio || '';
            document.getElementById('conf_rfc').value = d.rfc || '';
            document.getElementById('conf_telefono').value = d.telefono || '';
            document.getElementById('conf_email').value = d.email || '';
            document.getElementById('conf_direccion').value = d.direccion || '';
            document.getElementById('conf_mensaje').value = d.mensaje_ticket || '';
        }
    } catch (e) { console.error("Error cargando config:", e); }

    // Manejar guardado
    document.getElementById('configForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());
        
        await apiPost('configuracion/save', data, { successMsg: "Configuración actualizada correctamente" });
    });
}
