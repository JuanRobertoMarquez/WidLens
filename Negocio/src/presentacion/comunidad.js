let map;
let markersGroup;
let observacionesGlobales = []; // Aquí guardaremos los datos reales de tu base de datos

document.addEventListener("DOMContentLoaded", () => {
    // 1. Verificar si el usuario está logueado
    verificarSesion();
    
    // 2. Inicializar la estructura del mapa
    initMapaComunidad();
    
    // 3. Traer los datos reales de tu base de datos
    obtenerObservacionesReales();

    // 4. Escuchar los filtros
    document.getElementById('search-especie').addEventListener('input', filtrarDatos);
    document.getElementById('filter-estatus').addEventListener('change', filtrarDatos);
});

function initMapaComunidad() {
    // Centramos el mapa en México
    map = L.map('mapa-comunidad').setView([19.4326, -99.1332], 7);
    
    // Capa de OpenStreetMap (Asegúrate de que use https:// para evitar bloqueos en tu hosting free.nf)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap de la comunidad WildLens'
    }).addTo(map);

    markersGroup = L.layerGroup().addTo(map);
}

// ==========================================
// CONEXIÓN CON TU BACKEND (NODE.JS / MYSQL)
// ==========================================
async function obtenerObservacionesReales() {
    try {
        // Mostramos un mensaje de carga mientras llegan los datos
        const grid = document.getElementById('grid-observaciones');
        grid.innerHTML = '<p style="text-align:center; width:100%; color:#666;">Cargando avistamientos desde el servidor...</p>';

        // Hacemos la petición a tu API. 
        // IMPORTANTE: Ajusta esta ruta según cómo se llame el endpoint en tu backend
        const response = await fetch('https://widlens.onrender.com/api/observaciones/comunidad'); 
        
        if (!response.ok) throw new Error('Error al conectar con la base de datos');
        
        const datosReales = await response.json();
        observacionesGlobales = datosReales; // Guardamos en memoria para los filtros
        
        // Renderizamos las tarjetas y los pines en el mapa
        renderizarObservaciones(observacionesGlobales);
        actualizarPinesMapa(observacionesGlobales);

        // ¡EL TRUCO PARA EL MAPA EN BLANCO!
        // Le damos un pequeño respiro de 200ms para que recalcule su tamaño ahora que hay datos
        setTimeout(() => {
            map.invalidateSize();
        }, 200);

    } catch (error) {
        console.error("Error obteniendo datos reales:", error);
        document.getElementById('grid-observaciones').innerHTML = `
            <p style="text-align:center; color:#d9534f; width:100%;">
                Hubo un problema al cargar los datos de la comunidad. Revisa la consola para más detalles.
            </p>`;
    }
}

function actualizarPinesMapa(datos) {
    markersGroup.clearLayers();
    
    datos.forEach(obs => {
        // Asegúrate de que tu base de datos devuelva 'lat' y 'lng' o ajusta los nombres aquí
        if (obs.lat && obs.lng) {
            const marker = L.marker([obs.lat, obs.lng]);
            const popupContent = `
                <div style="font-family: 'Open Sans', sans-serif; width: 160px;">
                    <strong style="font-family:'Lora',serif;">${obs.nombreComun || 'Especie sin nombre'}</strong><br>
                    <span style="font-size:11px; color:#666;">Por: @${obs.usuario || 'Anónimo'}</span><br>
                    <img src="${obs.imagen || 'https://via.placeholder.com/150'}" style="width:100%; height:90px; object-fit:cover; border-radius:4px; margin-top:5px;"/>
                </div>
            `;
            marker.bindPopup(popupContent);
            markersGroup.addLayer(marker);
        }
    });
}

function renderizarObservaciones(datos) {
    const grid = document.getElementById('grid-observaciones');
    grid.innerHTML = '';

    if (!datos || datos.length === 0) {
        grid.innerHTML = `<p style="text-align:center; color:#666; width:100%; grid-column: 1/-1; padding: 40px 0;">Aún no hay observaciones de la comunidad.</p>`;
        return;
    }

    datos.forEach(obs => {
        // Validamos el estatus para asignar los colores
        const estatus = obs.estatus || 'Pendiente';
        const badgeClass = estatus.toLowerCase() === "validado" ? "status-validado" : "status-pendiente";
        const cleanEstatus = estatus.toLowerCase() === "validado" ? "Validado ✔" : "Pendiente 🕒";

        // Ajustamos la ruta de la imagen y el avatar por si vienen incompletas desde la BD
        const urlImagen = obs.imagen ? (obs.imagen.startsWith('http') ? obs.imagen : `https://widlens.onrender.com${obs.imagen}`) : 'https://via.placeholder.com/300';
        const urlAvatar = obs.avatar ? (obs.avatar.startsWith('http') ? obs.avatar : `https://widlens.onrender.com${obs.avatar}`) : 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png';

        const card = document.createElement('div');
        card.className = 'obs-card-com';
        card.innerHTML = `
            <div class="obs-img-wrapper">
                <img src="${urlImagen}" alt="${obs.nombreComun}">
                <span class="status-badge ${badgeClass}">${cleanEstatus}</span>
            </div>
            <div class="obs-body">
                <div class="obs-user-info">
                    <img src="${urlAvatar}" alt="Avatar" class="obs-avatar">
                    <span class="obs-username">@${obs.usuario || 'usuario_anonimo'}</span>
                </div>
                <h3 class="obs-species-title">${obs.nombreComun || 'Especie desconocida'}</h3>
                <p class="obs-scientific-name">${obs.nombreCientifico || 'Investigando...'}</p>
                <div class="obs-footer-meta">
                    <span>📍 ${obs.ubicacionText || 'Ubicación no especificada'}</span>
                    <span>📅 ${obs.fecha ? new Date(obs.fecha).toLocaleDateString() : 'Fecha desconocida'}</span>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
}

function filtrarDatos() {
    const query = document.getElementById('search-especie').value.toLowerCase();
    const estatus = document.getElementById('filter-estatus').value.toLowerCase();

    const datosFiltrados = observacionesGlobales.filter(obs => {
        const nombreC = obs.nombreComun ? obs.nombreComun.toLowerCase() : '';
        const nombreCient = obs.nombreCientifico ? obs.nombreCientifico.toLowerCase() : '';
        const estatusObs = obs.estatus ? obs.estatus.toLowerCase() : 'pendiente';

        const coincideEspecie = nombreC.includes(query) || nombreCient.includes(query);
        const coincideEstatus = estatus === 'todos' || estatusObs === estatus;
        
        return coincideEspecie && coincideEstatus;
    });

    renderizarObservaciones(datosFiltrados);
    actualizarPinesMapa(datosFiltrados);
}

// Mantenemos tu función de sesión intacta
function verificarSesion() {
    const menuVisitante = document.getElementById('menu-visitante');
    const menuUsuario = document.getElementById('menu-usuario');
    const navNombreUsuario = document.getElementById('nav-nombre-usuario');
    const navAvatar = document.getElementById('nav-avatar');

    const usuarioString = localStorage.getItem('usuarioWildLens');

    if (usuarioString) {
        const usuarioLogueado = JSON.parse(usuarioString);
        if (menuVisitante) menuVisitante.style.display = 'none';
        if (menuUsuario) menuUsuario.style.display = 'flex';
        if (navNombreUsuario) navNombreUsuario.innerText = usuarioLogueado.nombre;
        if (navAvatar && usuarioLogueado.avatar) {
            navAvatar.src = usuarioLogueado.avatar.startsWith('http') 
                ? usuarioLogueado.avatar 
                : 'https://widlens.onrender.com' + usuarioLogueado.avatar;
        }
    } else {
        if (menuVisitante) menuVisitante.style.display = 'flex';
        if (menuUsuario) menuUsuario.style.display = 'none';
    }
}