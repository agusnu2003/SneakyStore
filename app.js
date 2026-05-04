const CSV_URL = './products.csv';
// Google Sheets URL for reference/backup:
// https://docs.google.com/spreadsheets/d/e/2PACX-1vTBxqFjIMXxKJCLZwxdKZbOl6RjTZPU8_CSvTnsMAMM1AxXmSWIwRKLBeH1w8xmyINMvUFxS1fT3HDU/pub?gid=0&single=true&output=csv


document.addEventListener('DOMContentLoaded', () => {
    fetchProducts();
});

function fetchProducts() {
    // Intentamos cargar usando fetch nativo
    fetch(CSV_URL)
        .then(response => {
            if (!response.ok) {
                throw new Error("HTTP error " + response.status);
            }
            return response.text();
        })
        .then(csvText => {
            // Parseamos el texto CSV que acabamos de descargar
            Papa.parse(csvText, {
                header: true,
                skipEmptyLines: true,
                complete: function(results) {
                    console.log("Datos parseados:", results.data);
                    renderProducts(results.data);
                },
                error: function(err) {
                    throw new Error("Error al parsear el CSV: " + err.message);
                }
            });
        })
        .catch(error => {
            console.error("Error de red o CORS:", error);
            // Si falla por CORS al estar en file://, mostramos un mensaje específico
            const loader = document.getElementById('loader');
            loader.innerHTML = `
                <div style="color: var(--accent-color);">
                    <p><b>Error de conexión (Probablemente CORS o bloqueo local).</b></p>
                    <p style="font-size: 1rem; margin-top: 10px;">
                        Al abrir el archivo con doble clic (file:///), el navegador bloquea la descarga por seguridad.<br>
                        Para solucionarlo rápidamente vamos a usar un proxy seguro, o puedes usar "Live Server" en VSCode.
                    </p>
                </div>
            `;
            
            // Intento de fallback automático usando un proxy CORS gratuito
            fetchProductsConProxy();
        });
}

function fetchProductsConProxy() {
    console.log("Intentando descargar mediante proxy CORS...");
    const proxyUrl = 'https://api.allorigins.win/raw?url=' + encodeURIComponent(CSV_URL);
    
    fetch(proxyUrl)
        .then(res => res.text())
        .then(csvText => {
            Papa.parse(csvText, {
                header: true,
                skipEmptyLines: true,
                complete: function(results) {
                    renderProducts(results.data);
                }
            });
        })
        .catch(err => {
            document.getElementById('loader').innerText = "Hubo un error crítico al cargar los productos. " + err;
        });
}

function convertDriveUrl(url) {
    if (!url) return '';
    
    // Si ya es un link directo o externo que no es Drive, lo devolvemos
    if (!url.includes('drive.google.com')) return url;

    // Extraemos el ID del archivo de diferentes formatos comunes de Google Drive
    const driveRegex = /[-\w]{25,}/;
    const match = url.match(driveRegex);
    
    if (match && match[0]) {
        // Usamos el endpoint de thumbnail que es mucho más estable y no sufre bloqueos de cookies de terceros en Chrome
        return `https://drive.google.com/thumbnail?id=${match[0]}&sz=w1000`;
    }
    return url;
}

function renderProducts(products) {
    const isProductPage = window.location.pathname.includes('product.html');
    
    // Agrupar productos
    const agrupados = {};
    products.forEach(product => {
        const keys = Object.keys(product);
        const getVal = (keyName) => {
            const foundKey = keys.find(k => k.trim().toLowerCase().includes(keyName.toLowerCase()));
            return foundKey ? product[foundKey] : null;
        };

        const id = getVal('id') || getVal('remera') || getVal('nombre');
        const nombre = getVal('nombre');
        const precio = getVal('precio');
        const foto = getVal('foto_1') || getVal('foto');
        const talles = getVal('talles');
        const color = getVal('colores') || getVal('color');

        // Extraer múltiples fotos
        const fotos = [];
        for (let i = 1; i <= 5; i++) {
            const f = getVal(`foto_${i}`);
            if (f && f.trim() !== '') {
                fotos.push(convertDriveUrl(f.trim()));
            }
        }
        if (fotos.length === 0) {
            const f = getVal('foto');
            if (f && f.trim() !== '') fotos.push(convertDriveUrl(f.trim()));
        }
        
        let videoUrl = getVal('video') || null;
        if (videoUrl && videoUrl.trim() !== '') {
            videoUrl = videoUrl.trim();
            // Si es un link de Drive, lo convertimos a formato preview para el iframe
            const driveRegex = /[-\w]{25,}/;
            const match = videoUrl.match(driveRegex);
            if (match && match[0] && videoUrl.includes('drive.google.com')) {
                videoUrl = `https://drive.google.com/file/d/${match[0]}/preview`;
            }
        } else {
            videoUrl = null;
        }

        if (!nombre) return;
        const finalId = id || nombre;

        if (!agrupados[finalId]) {
            agrupados[finalId] = {
                id: finalId,
                nombre,
                precio,
                talles: talles ? talles.split(',').map(t => t.trim()) : [],
                variantes: []
            };
        }

        agrupados[finalId].variantes.push({
            color: color || 'Único',
            fotos: fotos,
            video: videoUrl,
            foto: fotos.length > 0 ? fotos[0] : ''
        });
    });

    if (isProductPage) {
        renderProductDetail(agrupados);
    } else {
        renderProductGrid(agrupados);
    }
}

function renderProductGrid(agrupados) {
    const grid = document.getElementById('product-grid');
    const loader = document.getElementById('loader');
    if(loader) loader.style.display = 'none';
    
    const ids = Object.keys(agrupados);
    if (ids.length === 0) {
        grid.innerHTML = '<p>Se cargó el archivo, pero no se encontraron productos válidos.</p>';
        return;
    }

    ids.forEach((id, index) => {
        const prod = agrupados[id];
        const card = document.createElement('div');
        card.className = 'product-card';
        
        const precioNumero = parseFloat(prod.precio) || 0;
        const precioFormatted = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(precioNumero);

        const defaultVar = prod.variantes[0];
        const imageUrl = defaultVar.foto;
        let imageElement = imageUrl ? `<img src="${imageUrl}" alt="${prod.nombre}" class="product-image" id="img-prod-${index}">` : `<span class="no-image" id="img-prod-${index}">Sin imagen</span>`;

        let coloresHtml = '<div class="color-swatches">';
        prod.variantes.forEach((v, vIndex) => {
            let cssColor = v.color.toLowerCase().trim();
            const colorMap = { 'black': '#000', 'negro': '#000', 'white': '#fff', 'blanco': '#fff', 'blue': '#3b82f6', 'azul': '#3b82f6', 'red': '#ef4444', 'rojo': '#ef4444', 'green': '#22c55e', 'verde': '#22c55e', 'gray': '#6b7280', 'gris': '#6b7280' };
            let bg = colorMap[cssColor] || cssColor;
            coloresHtml += `<div class="color-swatch ${vIndex === 0 ? 'active' : ''}" style="background-color: ${bg};" title="${v.color}" data-foto="${v.foto}" data-index="${index}"></div>`;
        });
        coloresHtml += '</div>';

        card.innerHTML = `
            <a href="product.html?id=${encodeURIComponent(id)}" style="text-decoration: none; color: inherit; display: contents;">
                <div class="product-image-wrapper">${imageElement}</div>
            </a>
            <div class="product-info">
                <a href="product.html?id=${encodeURIComponent(id)}" style="text-decoration: none; color: inherit;">
                    <h3 class="product-title">${prod.nombre}</h3>
                </a>
                <div class="product-price">${precioFormatted}</div>
                <div class="product-details" style="flex-direction: column; gap: 0.5rem;">
                    <div><span class="detail-label">Colores disponibles:</span>${coloresHtml}</div>
                </div>
                <a href="product.html?id=${encodeURIComponent(id)}" class="buy-btn" style="text-decoration: none; display: block; text-align: center;">VER PRODUCTO</a>
            </div>
        `;
        grid.appendChild(card);
    });

    document.querySelectorAll('.color-swatch').forEach(swatch => {
        swatch.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const el = e.target;
            const newFoto = el.getAttribute('data-foto');
            const prodIndex = el.getAttribute('data-index');
            const imgEl = document.getElementById(`img-prod-${prodIndex}`);
            if (imgEl && newFoto) {
                if (imgEl.tagName === 'IMG') imgEl.src = newFoto;
                else imgEl.outerHTML = `<img src="${newFoto}" class="product-image" id="img-prod-${prodIndex}">`;
            }
            el.parentElement.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
            el.classList.add('active');
        });
    });
}

function renderProductDetail(agrupados) {
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');
    const loader = document.getElementById('loader');
    const container = document.getElementById('pdp-container');
    
    if(loader) loader.style.display = 'none';

    if (!productId || !agrupados[productId]) {
        container.style.display = 'block';
        container.innerHTML = '<h2>Producto no encontrado</h2><p>El producto que buscas no existe o fue eliminado.</p><a href="index.html" class="buy-btn" style="display:inline-block; margin-top:2rem;">Volver al inicio</a>';
        return;
    }

    const prod = agrupados[productId];
    container.style.display = 'grid';

    document.getElementById('pdp-title').innerText = prod.nombre;
    const precioNumero = parseFloat(prod.precio) || 0;
    document.getElementById('pdp-price').innerText = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(precioNumero);
    
    const mainImg = document.getElementById('pdp-main-image');
    const mainVideo = document.getElementById('pdp-main-video');
    const prevBtn = document.getElementById('carousel-prev');
    const nextBtn = document.getElementById('carousel-next');
    
    let currentPhotoIndex = 0;
    let currentMedia = [];
    
    function loadMediaFromVariant(vari) {
        currentMedia = [];
        if (vari.fotos && vari.fotos.length > 0) {
            vari.fotos.forEach(f => currentMedia.push({ type: 'image', url: f }));
        } else if (vari.foto) {
            currentMedia.push({ type: 'image', url: vari.foto });
        }
        
        if (vari.video) {
            currentMedia.push({ type: 'video', url: vari.video });
        }
    }
    
    loadMediaFromVariant(prod.variantes[0]);
    
    function updateCarousel() {
        if (!currentMedia || currentMedia.length === 0) return;
        const mediaItem = currentMedia[currentPhotoIndex];
        
        if (mediaItem.type === 'image') {
            if(mainImg) { mainImg.src = mediaItem.url; mainImg.style.display = 'block'; }
            if(mainVideo) { mainVideo.src = ''; mainVideo.style.display = 'none'; }
        } else if (mediaItem.type === 'video') {
            if(mainImg) { mainImg.style.display = 'none'; }
            if(mainVideo) { mainVideo.src = mediaItem.url; mainVideo.style.display = 'block'; }
        }
        
        if (currentMedia.length > 1) {
            if(prevBtn) prevBtn.style.display = 'flex';
            if(nextBtn) nextBtn.style.display = 'flex';
        } else {
            if(prevBtn) prevBtn.style.display = 'none';
            if(nextBtn) nextBtn.style.display = 'none';
        }
    }
    
    if (prevBtn) {
        prevBtn.onclick = () => {
            if (!currentMedia || currentMedia.length === 0) return;
            currentPhotoIndex = (currentPhotoIndex - 1 + currentMedia.length) % currentMedia.length;
            updateCarousel();
        };
    }
    
    if (nextBtn) {
        nextBtn.onclick = () => {
            if (!currentMedia || currentMedia.length === 0) return;
            currentPhotoIndex = (currentPhotoIndex + 1) % currentMedia.length;
            updateCarousel();
        };
    }
    
    updateCarousel();

    // Render Sizes
    const sizesContainer = document.getElementById('pdp-sizes');
    let selectedSize = null;
    if (prod.talles.length > 0 && prod.talles[0] !== "") {
        prod.talles.forEach(talle => {
            const btn = document.createElement('button');
            btn.className = 'size-btn';
            btn.innerText = talle;
            btn.onclick = () => {
                document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                selectedSize = talle;
            };
            sizesContainer.appendChild(btn);
        });
    } else {
        sizesContainer.innerHTML = '<span style="font-family: var(--font-mono); color: var(--text-secondary);">Talle Único</span>';
        selectedSize = 'Único';
    }

    // Render Colors
    const colorsContainer = document.getElementById('pdp-colors');
    let selectedColor = prod.variantes[0].color;
    let selectedFoto = prod.variantes[0].foto;
    
    prod.variantes.forEach((v, index) => {
        let cssColor = v.color.toLowerCase().trim();
        const colorMap = { 'black': '#000', 'negro': '#000', 'white': '#fff', 'blanco': '#fff', 'blue': '#3b82f6', 'azul': '#3b82f6', 'red': '#ef4444', 'rojo': '#ef4444', 'green': '#22c55e', 'verde': '#22c55e', 'gray': '#6b7280', 'gris': '#6b7280' };
        let bg = colorMap[cssColor] || cssColor;
        
        const swatch = document.createElement('div');
        swatch.className = `pdp-color-swatch ${index === 0 ? 'active' : ''}`;
        swatch.style.backgroundColor = bg;
        swatch.title = v.color;
        
        swatch.onclick = () => {
            document.querySelectorAll('.pdp-color-swatch').forEach(s => s.classList.remove('active'));
            swatch.classList.add('active');
            selectedColor = v.color;
            selectedFoto = v.foto;
            
            loadMediaFromVariant(v);
            currentPhotoIndex = 0;
            updateCarousel();
        };
        colorsContainer.appendChild(swatch);
    });

    // Add to cart
    document.getElementById('pdp-add-btn').onclick = () => {
        if (!selectedSize) {
            alert('Por favor selecciona un talle antes de agregar al carrito.');
            return;
        }
        
        addToCart({
            id: prod.id,
            nombre: prod.nombre,
            precio: precioNumero,
            foto: selectedFoto,
            talle: selectedSize,
            color: selectedColor
        });
    };
}
