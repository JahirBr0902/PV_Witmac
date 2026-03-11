// Módulo de ventas
function loadVentas() {
    const content = document.getElementById('pageContent');
    content.innerHTML = `
        <div class="fade-in">
            <h2 class="mb-4"><i class="bi bi-cart"></i> Nueva Venta</h2>
            
            <div class="row">
                <div class="col-md-8">
                    <div class="card mb-3">
                        <div class="card-header">
                            <i class="bi bi-search"></i> Buscar Producto
                        </div>
                        <div class="card-body">
                            <div class="product-search">
                                <input type="text" 
                                       class="form-control form-control-lg" 
                                       id="searchProduct" 
                                       placeholder="Buscar por código o nombre...">
                                <div id="searchResults" class="search-results" style="display: none;"></div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="card">
                        <div class="card-header">
                            <i class="bi bi-cart-fill"></i> Productos en Carrito
                        </div>
                        <div class="card-body">
                            <div id="cartItems">
                                <p class="text-center text-muted">No hay productos en el carrito</p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="col-md-4">
                    <div class="card cart-summary">
                        <div class="card-body">
                            <h5 class="mb-3">Resumen</h5>
                            
                            <div class="mb-3">
                                <label class="form-label">Cliente</label>
                                <select class="form-select" id="selectCliente">
                                    <option value="">Cargando...</option>
                                </select>
                            </div>
                            
                            <hr>
                            
                            <div class="d-flex justify-content-between mb-2">
                                <span>Subtotal:</span>
                                <strong id="subtotalAmount">$0.00</strong>
                            </div>
                            <div class="d-flex justify-content-between mb-2">
                                <span>Descuento:</span>
                                <div class="input-group input-group-sm" style="width: 100px;">
                                    <input type="number" class="form-control" id="descuento" value="0" min="0" step="0.01">
                                </div>
                            </div>
                            
                            <hr>
                            
                            <div class="d-flex justify-content-between mb-3">
                                <h5>Total:</h5>
                                <h4 class="text-success" id="totalAmount">$0.00</h4>
                            </div>
                            
                            <div class="mb-3">
                                <label class="form-label">Método de Pago</label>
                                <select class="form-select" id="metodoPago">
                                    <option value="">Seleccione método</option>
                                    <option value="efectivo">Efectivo</option>
                                    <option value="transferencia">Transferencia</option>
                                </select>
                            </div>
                            
                            <div class="mb-3">
                                <label class="form-label">Monto Pagado</label>
                                <input type="number" 
                                       class="form-control" 
                                       id="montoPagado" 
                                       value="0" 
                                       min="0" 
                                       step="0.01"
                                       placeholder="Ingrese monto pagado">
                            </div>
                            
                            <div class="mb-3" id="saldoContainer" style="display: none;">
                                <label class="form-label text-warning fw-bold">Saldo pendiente (Crédito)</label>
                                <h5 class="text-warning" id="saldoAmount">$0.00</h5>
                            </div>

                            <div class="mb-3" id="cambioContainer" style="display: none;">
                                <label class="form-label text-success fw-bold">Cambio a devolver</label>
                                <h3 class="text-success fw-bold" id="cambioAmount">$0.00</h3>
                            </div>
                            
                            <button class="btn btn-success w-100 btn-lg" id="btnCompletarVenta" disabled>
                                <i class="bi bi-check-circle"></i> Completar Venta
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    initVentasModule();
}

function initVentasModule() {
    cart = [];
    loadClientesSelect().then(() => {
        const editId = sessionStorage.getItem('editandoVentaId');
        if (editId) cargarVentaParaEdicion(editId);
    });
    
    const searchInput = document.getElementById('searchProduct');
    const searchResults = document.getElementById('searchResults');
    
    let searchTimeout;
    searchInput.addEventListener('input', function() {
        clearTimeout(searchTimeout);
        const query = this.value.trim();
        if (query.length < 2) {
            searchResults.style.display = 'none';
            return;
        }
        searchTimeout = setTimeout(() => searchProducts(query), 300);
    });

    // Soporte para Lector de Código de Barras (Tecla Enter)
    searchInput.addEventListener('keypress', async function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            const query = this.value.trim();
            if (query.length > 0) {
                await processBarcode(query);
            }
        }
    });
    
    document.getElementById('descuento').addEventListener('input', updateCartSummary);
    document.getElementById('montoPagado').addEventListener('input', validarMontoPagado);
    document.getElementById('metodoPago').addEventListener('change', validarMontoPagado);
    document.getElementById('btnCompletarVenta').addEventListener('click', completarVenta);
}

async function cargarVentaParaEdicion(id) {
    try {
        const v = await apiPost("ventas/listar", { id });
        if (!v) return;
        
        document.querySelector('h2').innerHTML = `
            <div class="d-flex align-items-center gap-3">
                <i class="bi bi-pencil-square text-warning"></i> Editando Venta: ${v.folio}
                <button class="btn btn-sm btn-danger shadow-sm" onclick="cancelarEdicionVenta()">
                    <i class="bi bi-x-circle"></i> Cancelar Edición
                </button>
            </div>`;

        cart = v.detalles.map(d => ({
            id: d.producto_id,
            codigo: d.codigo || 'N/A',
            nombre: d.producto_nombre,
            precio_venta: parseFloat(d.precio_unitario),
            cantidad: parseInt(d.cantidad),
            stock: 9999, 
            subtotal: parseFloat(d.subtotal)
        }));
        document.getElementById('selectCliente').value = v.cliente_id || "";
        document.getElementById('descuento').value = v.descuento;
        document.getElementById('metodoPago').value = v.metodo_pago;
        document.getElementById('montoPagado').value = v.monto_pagado;
        updateCartDisplay();
        validarMontoPagado();
    } catch (e) { 
        console.error(e); 
        sessionStorage.removeItem('editandoVentaId'); 
        notify("Error", "No se pudo cargar la venta", "error");
    }
}

function cancelarEdicionVenta() {
    sessionStorage.removeItem('editandoVentaId');
    loadVentas(); // Recarga el módulo completo para resetear la interfaz a "Nueva Venta"
}

async function searchProducts(query) {
  if (!query || query.length < 2) {
    document.getElementById("searchResults").style.display = "none";
    return;
  }
  try {
    const response = await apiPost("productos/buscar", { q: query });
    const searchResults = document.getElementById("searchResults");
    if (response.success && response.data.length > 0) {
      let html = "";
      response.data.forEach(producto => {
        html += `
          <div class="search-result-item" data-producto='${JSON.stringify(producto)}'>
            <div class="d-flex justify-content-between">
              <div>
                <strong>${producto.nombre}</strong><br>
                <small class="text-muted">Código: ${producto.codigo} | Stock: ${producto.stock}</small>
              </div>
              <div class="text-end">
                <strong class="text-success">$${parseFloat(producto.precio_venta).toFixed(2)}</strong>
              </div>
            </div>
          </div>
        `;
      });
      searchResults.innerHTML = html;
      searchResults.style.display = "block";
      document.querySelectorAll(".search-result-item").forEach(item => {
        item.addEventListener("click", function () {
          const producto = JSON.parse(this.dataset.producto);
          addToCart(producto);
          searchResults.style.display = "none";
          document.getElementById("searchProduct").value = "";
        });
      });
    } else {
      searchResults.innerHTML = '<div class="p-3 text-muted text-center">No se encontraron productos</div>';
      searchResults.style.display = "block";
    }
  } catch (error) { console.error("Error buscando productos:", error); }
}

function addToCart(producto) {
    const productId = parseInt(producto.id);
    const existingItem = cart.find(item => item.id === productId);
    if (existingItem) {
        if (existingItem.cantidad < producto.stock) {
            existingItem.cantidad++;
            existingItem.subtotal = existingItem.cantidad * existingItem.precio_venta;
        } else {
            Swal.fire({ icon: 'warning', title: 'Stock insuficiente', text: `Solo hay ${producto.stock} unidades disponibles` });
            return;
        }
    } else {
        if (producto.stock > 0) {
            cart.push({
                id: productId,
                codigo: producto.codigo,
                nombre: producto.nombre,
                precio_venta: parseFloat(producto.precio_venta),
                cantidad: 1,
                stock: producto.stock,
                subtotal: parseFloat(producto.precio_venta)
            });
        } else {
            Swal.fire({ icon: 'error', title: 'Sin stock', text: 'Este producto no tiene stock disponible' });
            return;
        }
    }
    updateCartDisplay();
}

function updateCartDisplay() {
    const cartContainer = document.getElementById('cartItems');
    if (cart.length === 0) {
        cartContainer.innerHTML = '<p class="text-center text-muted">No hay productos en el carrito</p>';
        updateCartSummary();
        return;
    }
    let html = '<div class="table-responsive"><table class="table table-sm">';
    html += '<thead><tr><th>Producto</th><th>Precio</th><th>Cantidad</th><th>Subtotal</th><th></th></tr></thead><tbody>';
    cart.forEach((item, index) => {
        html += `
            <tr>
                <td><strong>${item.nombre}</strong><br><small class="text-muted">${item.codigo}</small></td>
                <td>$${item.precio_venta.toFixed(2)}</td>
                <td>
                    <div class="input-group input-group-sm" style="width: 120px;">
                        <button class="btn btn-outline-secondary" onclick="updateQuantity(${index}, -1)">-</button>
                        <input type="number" class="form-control text-center" value="${item.cantidad}" 
                               min="1" max="${item.stock}" onchange="setQuantity(${index}, this.value)">
                        <button class="btn btn-outline-secondary" onclick="updateQuantity(${index}, 1)">+</button>
                    </div>
                </td>
                <td><strong>$${item.subtotal.toFixed(2)}</strong></td>
                <td><button class="btn btn-sm btn-danger" onclick="removeFromCart(${index})"><i class="bi bi-trash"></i></button></td>
            </tr>
        `;
    });
    html += '</tbody></table></div>';
    cartContainer.innerHTML = html;
    updateCartSummary();
}

function updateQuantity(index, change) {
    const item = cart[index];
    const newQuantity = item.cantidad + change;
    if (newQuantity < 1) { removeFromCart(index); return; }
    if (newQuantity > item.stock) {
        Swal.fire({ icon: 'warning', title: 'Stock insuficiente', text: `Solo hay ${item.stock} unidades disponibles`, timer: 2000 });
        return;
    }
    item.cantidad = newQuantity;
    item.subtotal = item.cantidad * item.precio_venta;
    updateCartDisplay();
}

function setQuantity(index, value) {
    const quantity = parseInt(value);
    const item = cart[index];
    if (isNaN(quantity) || quantity < 1) { updateCartDisplay(); return; }
    if (quantity > item.stock) {
        Swal.fire({ icon: 'warning', title: 'Stock insuficiente', text: `Solo hay ${item.stock} unidades disponibles`, timer: 2000 });
        updateCartDisplay();
        return;
    }
    item.cantidad = quantity;
    item.subtotal = item.cantidad * item.precio_venta;
    updateCartDisplay();
}

function removeFromCart(index) {
    cart.splice(index, 1);
    updateCartDisplay();
}

function updateCartSummary() {
    const subtotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
    const descuento = parseFloat(document.getElementById('descuento')?.value || 0);
    const total = Math.max(0, subtotal - descuento);
    if (document.getElementById('subtotalAmount')) {
        document.getElementById('subtotalAmount').textContent = '$' + subtotal.toFixed(2);
        document.getElementById('totalAmount').textContent = '$' + total.toFixed(2);
    }
}

async function loadClientesSelect() {
    try {
        const data = await apiPost('clientes/listar');
        const select = document.getElementById('selectCliente');
        let html = '<option value="">Cliente General</option>';
        data.forEach(cliente => { html += `<option value="${cliente.id}">${cliente.nombre}</option>`; });
        select.innerHTML = html;
    } catch (error) { console.error('Error cargando clientes:', error); }
}

function validarMontoPagado() {
    const totalText = document.getElementById('totalAmount')?.textContent || "$0.00";
    const total = parseFloat(totalText.replace('$', ''));
    const montoPagado = parseFloat(document.getElementById('montoPagado')?.value) || 0;
    const metodoPago = document.getElementById('metodoPago')?.value;
    const btnCompletar = document.getElementById('btnCompletarVenta');
    
    const saldoContainer = document.getElementById('saldoContainer');
    const saldoAmount = document.getElementById('saldoAmount');
    const cambioContainer = document.getElementById('cambioContainer');
    const cambioAmount = document.getElementById('cambioAmount');

    const diferencia = total - montoPagado;

    if (diferencia > 0) {
        // Hay deuda (Crédito)
        if (saldoContainer) saldoContainer.style.display = 'block';
        if (saldoAmount) saldoAmount.textContent = formatCurrency(diferencia);
        if (cambioContainer) cambioContainer.style.display = 'none';
    } else if (diferencia < 0) {
        // Hay cambio a devolver
        if (saldoContainer) saldoContainer.style.display = 'none';
        if (cambioContainer) cambioContainer.style.display = 'block';
        if (cambioAmount) cambioAmount.textContent = formatCurrency(Math.abs(diferencia));
    } else {
        // Pago exacto
        if (saldoContainer) saldoContainer.style.display = 'none';
        if (cambioContainer) cambioContainer.style.display = 'none';
    }

    if (btnCompletar) btnCompletar.disabled = !(montoPagado >= 0 && metodoPago);
}

async function completarVenta() {
  if (!cart || cart.length === 0) {
    Swal.fire({ icon: 'warning', title: 'Carrito vacío' });
    return;
  }
  const editId = sessionStorage.getItem('editandoVentaId');
  const clienteId = document.getElementById('selectCliente').value || null;
  const descuento = parseFloat(document.getElementById('descuento').value || 0);
  const metodoPago = document.getElementById('metodoPago').value;
  const montoPagado = parseFloat(document.getElementById('montoPagado').value) || 0;
  const total = parseFloat(document.getElementById('totalAmount').textContent.replace('$', ''));
  const saldo = Math.max(0, total - montoPagado);

  if (!metodoPago) { Swal.fire({ icon: 'warning', title: 'Método de pago requerido' }); return; }

  const venta = {
    id: editId,
    cliente_id: clienteId,
    productos: cart,
    descuento,
    metodo_pago: metodoPago,
    monto_pagado: montoPagado,
    saldo: saldo
  };

  try {
    const response = await apiPost(editId ? "ventas/editar" : "ventas/nuevo", venta);
    
    // Preguntar si desea imprimir el ticket
    const { isConfirmed: imprimir } = await Swal.fire({
      icon: 'success',
      title: editId ? '¡Venta actualizada!' : '¡Venta completada!',
      html: `<p>Folio: <strong>${response.folio}</strong></p><p>Total: <strong>$${parseFloat(response.total).toFixed(2)}</strong></p>`,
      showCancelButton: true,
      confirmButtonText: '<i class="bi bi-printer"></i> Imprimir Ticket',
      cancelButtonText: 'No imprimir',
      confirmButtonColor: '#0d6efd'
    });

    if (imprimir) {
        imprimirTicketVenta(response.id);
    }

    sessionStorage.removeItem('editandoVentaId');
    cart = [];
    updateCartDisplay();
    if (editId) document.querySelector('[data-page="reportes"]').click();
    else {
        document.getElementById('searchProduct').value = '';
        document.getElementById('descuento').value = '0';
        document.getElementById('metodoPago').value = '';
        document.getElementById('montoPagado').value = '0';
        if (document.getElementById('saldoContainer')) document.getElementById('saldoContainer').style.display = 'none';
        document.getElementById('btnCompletarVenta').disabled = true;
    }
  } catch (error) { console.error("Error procesando venta:", error); }
}

async function processBarcode(code) {
    try {
        const response = await apiPost("productos/buscar", { q: code }, { showLoader: false });
        if (response.success && response.data.length > 0) {
            // Si hay una coincidencia exacta por código, o solo un resultado, lo añadimos
            const exactMatch = response.data.find(p => p.codigo === code) || (response.data.length === 1 ? response.data[0] : null);
            
            if (exactMatch) {
                addToCart(exactMatch);
                document.getElementById("searchProduct").value = "";
                document.getElementById("searchResults").style.display = "none";
            } else {
                // Si hay varios parecidos pero ninguno exacto, mostramos los resultados
                searchProducts(code);
            }
        } else {
            notify("No encontrado", `El código ${code} no existe`, "warning");
        }
    } catch (error) {
        console.error("Error procesando código de barras:", error);
    }
}