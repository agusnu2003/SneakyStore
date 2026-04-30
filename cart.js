// Lógica del Carrito de Compras usando localStorage

document.addEventListener('DOMContentLoaded', () => {
    initCart();
});

let cart = [];

function initCart() {
    // Cargar carrito desde localStorage
    const savedCart = localStorage.getItem('sneaky_cart');
    if (savedCart) {
        try {
            cart = JSON.parse(savedCart);
        } catch (e) {
            cart = [];
        }
    }
    
    // Configurar eventos del carrito lateral
    const cartIcon = document.getElementById('cart-icon-btn');
    const cartSidebar = document.getElementById('cart-sidebar');
    const closeCartBtn = document.getElementById('close-cart-btn');
    const overlay = document.getElementById('cart-overlay');
    
    if (cartIcon) {
        cartIcon.addEventListener('click', (e) => {
            e.preventDefault();
            openCart();
        });
    }
    
    if (closeCartBtn) {
        closeCartBtn.addEventListener('click', closeCart);
    }
    
    if (overlay) {
        overlay.addEventListener('click', closeCart);
    }
    
    const checkoutBtn = document.getElementById('checkout-btn');
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', processCheckout);
    }
    
    updateCartUI();
}

function openCart() {
    document.getElementById('cart-sidebar').classList.add('open');
    document.getElementById('cart-overlay').classList.add('open');
    document.body.style.overflow = 'hidden'; // Evita scroll de fondo
}

function closeCart() {
    document.getElementById('cart-sidebar').classList.remove('open');
    document.getElementById('cart-overlay').classList.remove('open');
    document.body.style.overflow = '';
}

function addToCart(product) {
    // Buscar si ya existe el mismo producto con el mismo talle y color
    const existingIndex = cart.findIndex(item => 
        item.id === product.id && 
        item.talle === product.talle && 
        item.color === product.color
    );
    
    if (existingIndex >= 0) {
        cart[existingIndex].cantidad += 1;
    } else {
        cart.push({ ...product, cantidad: 1 });
    }
    
    saveCart();
    updateCartUI();
    openCart(); // Abrimos el carrito para mostrar que se agregó
}

function removeFromCart(index) {
    cart.splice(index, 1);
    saveCart();
    updateCartUI();
}

function saveCart() {
    localStorage.setItem('sneaky_cart', JSON.stringify(cart));
}

function updateCartUI() {
    // Actualizar badge del icono
    const badge = document.getElementById('cart-badge');
    const totalItems = cart.reduce((sum, item) => sum + item.cantidad, 0);
    
    if (badge) {
        badge.innerText = totalItems;
        badge.style.display = totalItems > 0 ? 'flex' : 'none';
    }
    
    // Actualizar lista dentro del sidebar
    const cartItemsContainer = document.getElementById('cart-items');
    const cartTotalElement = document.getElementById('cart-total-price');
    
    if (!cartItemsContainer || !cartTotalElement) return;
    
    if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<p class="empty-cart-msg">Tu carrito está vacío</p>';
        cartTotalElement.innerText = '$ 0';
        return;
    }
    
    let html = '';
    let total = 0;
    
    cart.forEach((item, index) => {
        const itemTotal = item.precio * item.cantidad;
        total += itemTotal;
        
        const precioFormatted = new Intl.NumberFormat('es-AR', { 
            style: 'currency', 
            currency: 'ARS',
            maximumFractionDigits: 0
        }).format(item.precio);

        html += `
            <div class="cart-item">
                <img src="${item.foto}" alt="${item.nombre}" class="cart-item-img">
                <div class="cart-item-info">
                    <div class="cart-item-title">${item.nombre}</div>
                    <div class="cart-item-variants">Talle: ${item.talle} | Color: ${item.color}</div>
                    <div class="cart-item-price">${precioFormatted} x ${item.cantidad}</div>
                </div>
                <button class="cart-item-remove" onclick="removeFromCart(${index})">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
            </div>
        `;
    });
    
    cartItemsContainer.innerHTML = html;
    
    const finalTotalFormatted = new Intl.NumberFormat('es-AR', { 
        style: 'currency', 
        currency: 'ARS',
        maximumFractionDigits: 0
    }).format(total);
    
    cartTotalElement.innerText = finalTotalFormatted;
}

function processCheckout() {
    if (cart.length === 0) {
        alert("Tu carrito está vacío.");
        return;
    }
    
    let text = "Hola SNEAKY STORE! Quiero hacer el siguiente pedido:\n\n";
    let total = 0;
    
    cart.forEach(item => {
        text += `- ${item.cantidad}x ${item.nombre} (Talle: ${item.talle}, Color: ${item.color})\n`;
        total += item.precio * item.cantidad;
    });
    
    const finalTotalFormatted = new Intl.NumberFormat('es-AR', { 
        style: 'currency', 
        currency: 'ARS',
        maximumFractionDigits: 0
    }).format(total);
    
    text += `\n*Total a pagar: ${finalTotalFormatted}*\n`;
    
    const phone = "5491156510298";
    const url = `https://api.whatsapp.com/send/?phone=${phone}&text=${encodeURIComponent(text)}`;
    
    window.open(url, '_blank');
}
