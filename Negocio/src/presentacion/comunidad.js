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

    cargarEstadisticasYPodio();

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
        if (obs.lat && obs.lng) {
            const marker = L.marker([obs.lat, obs.lng]);
            
            const nombreEspecie = obs.nombreComun || 'Especie en revisión';
            const nombreUsuario = obs.usuario || 'Anónimo';
            const idPopupLoc = `pop-${Math.random().toString(36).substr(2, 9)}`;

            // Corregimos la ruta de la foto para que no se rompa
            const rutaFoto = obs.imagen ? (obs.imagen.startsWith('http') ? obs.imagen : `https://widlens.onrender.com${obs.imagen}`) : 'https://via.placeholder.com/150';

            const popupContent = `
                <div style="font-family: 'Open Sans', sans-serif; width: 170px;">
                    <strong style="font-family:'Lora',serif; font-size:15px; color:#2B7055;">${nombreEspecie}</strong><br>
                    <span style="font-size:12px; color:#555;">📸 @${nombreUsuario}</span><br>
                    <img src="${rutaFoto}" style="width:100%; height:110px; object-fit:cover; border-radius:6px; margin:8px 0;"/>
                    <div style="font-size: 11px; color: #444; background: #f5f3ec; padding: 6px; border-radius: 4px; line-height: 1.4;">
                        📍 <strong id="${idPopupLoc}">Buscando calle... 🔎</strong>
                    </div>
                </div>
            `;
            
            marker.bindPopup(popupContent);
            markersGroup.addLayer(marker);

            // MAGIA: Solo traduce coordenadas a Calle cuando el usuario le da clic al pin
            marker.on('click', async () => {
                const spanLoc = document.getElementById(idPopupLoc);
                if(spanLoc && spanLoc.innerText.includes("Buscando")) {
                    try {
                        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${obs.lat}&lon=${obs.lng}`);
                        const geoDatos = await res.json();
                        
                        // Extraemos Específicamente la Calle (road) o la Colonia (suburb)
                        let calleOAvenida = geoDatos.address.road || geoDatos.address.suburb || geoDatos.address.neighbourhood || geoDatos.address.city || "Ubicación silvestre";
                        spanLoc.innerText = calleOAvenida;
                    } catch(e) {
                        spanLoc.innerText = `Lat: ${obs.lat}, Lng: ${obs.lng}`;
                    }
                }
            });
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
        const estatus = obs.estatus || 'Pendiente';
        const badgeClass = estatus.toLowerCase() === "validado" ? "status-validado" : "status-pendiente";
        const cleanEstatus = estatus.toLowerCase() === "validado" ? "Validado ✔" : "Pendiente 🕒";

        const urlImagen = obs.imagen ? (obs.imagen.startsWith('http') ? obs.imagen : `https://widlens.onrender.com${obs.imagen}`) : 'https://via.placeholder.com/300';
        const urlAvatar = obs.avatar ? (obs.avatar.startsWith('http') ? obs.avatar : `https://widlens.onrender.com${obs.avatar}`) : 'https://ui-avatars.com/api/?name=User&background=2B7055&color=fff';

        const nombreEspecie = obs.nombreComun || 'Especie en revisión';
        const nombreUsuario = obs.usuario || 'usuario_anonimo';
        const idUnicoLoc = `loc-${Math.random().toString(36).substr(2, 9)}`;

        const card = document.createElement('div');
        card.className = 'obs-card-com';
        card.innerHTML = `
            <div class="obs-img-wrapper">
                <img src="${urlImagen}" alt="${nombreEspecie}">
                <span class="status-badge ${badgeClass}">${cleanEstatus}</span>
            </div>
            <div class="obs-body">
                <div class="obs-user-info">
                    <img src="${urlAvatar}" alt="Avatar" class="obs-avatar">
                    <span class="obs-username">@${nombreUsuario}</span>
                </div>
                <h3 class="obs-species-title" style="margin-bottom: 12px;">${nombreEspecie}</h3>
                
                <div class="obs-footer-meta">
                    <span>📍 <span id="${idUnicoLoc}">Buscando calle...</span></span>
                    <span>📅 ${obs.fecha ? new Date(obs.fecha).toLocaleDateString() : 'Fecha desconocida'}</span>
                </div>
            </div>
        `;
        grid.appendChild(card);

        // Geocodificación para las Tarjetas (Calles y Avenidas)
        if (obs.lat && obs.lng) {
            fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${obs.lat}&lon=${obs.lng}`)
                .then(res => res.json())
                .then(geoDatos => {
                    // Mismo filtro: prioriza nombres de calles (road)
                    let calleOAvenida = geoDatos.address.road || geoDatos.address.suburb || geoDatos.address.neighbourhood || geoDatos.address.city || "Hábitat silvestre";
                    document.getElementById(idUnicoLoc).innerText = calleOAvenida;
                })
                .catch(() => {
                    document.getElementById(idUnicoLoc).innerText = "Ubicación en mapa";
                });
        } else {
            document.getElementById(idUnicoLoc).innerText = "Ubicación no especificada";
        }
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

// CARGAR ESTADÍSTICAS Y RANKING DINÁMICO
async function cargarEstadisticasYPodio() {
    try {
        const response = await fetch('https://widlens.onrender.com/api/comunidad/stats-top');
        if (!response.ok) throw new Error('Error al conectar con la BD para stats');
        
        const datos = await response.json();

        // 1. Animar los números de las estadísticas (Contador dinámico)
        animarContador('val-observaciones', datos.estadisticas.obs_totales || 0);
        animarContador('val-especies', datos.estadisticas.esp_identificadas || 0);
        animarContador('val-guardianes', datos.estadisticas.guard_activos || 0);

        // 2. Construir el Podio
        const topDatos = datos.topGuardianes;
        const podioContainer = document.getElementById('contenedor-podio');
        podioContainer.innerHTML = '';

        if (topDatos.length === 0) {
            podioContainer.innerHTML = '<p style="color:#666;">Aún no hay guardianes registrados.</p>';
            return;
        }

        // Extraemos a los ganadores (si existen)
        const primero = topDatos[0];
        const segundo = topDatos[1];
        const tercero = topDatos[2];

        // Construimos el HTML en el orden visual correcto: Plata, Oro, Bronce
        let podioHTML = '';

        if (segundo) {
            const ava2 = segundo.avatar ? (segundo.avatar.startsWith('http') ? segundo.avatar : `https://widlens.onrender.com${segundo.avatar}`) : `https://ui-avatars.com/api/?name=${segundo.nombre}&background=E2E8F0`;
            podioHTML += `
                <div class="guardian-card silver">
                    <div class="medal">🥈</div>
                    <img src="${ava2}" alt="Avatar" class="podium-avatar">
                    <h4 class="guardian-name">@${segundo.nombre}</h4>
                    <span class="guardian-score">${segundo.total_avistamientos} avistamientos</span>
                </div>`;
        }

        if (primero) {
            const ava1 = primero.avatar ? (primero.avatar.startsWith('http') ? primero.avatar : `https://widlens.onrender.com${primero.avatar}`) : `https://ui-avatars.com/api/?name=${primero.nombre}&background=FDE047`;
            podioHTML += `
                <div class="guardian-card gold">
                    <div class="medal">🥇</div>
                    <img src="${ava1}" alt="Avatar" class="podium-avatar">
                    <h4 class="guardian-name">@${primero.nombre}</h4>
                    <span class="guardian-score">${primero.total_avistamientos} avistamientos</span>
                </div>`;
        }

        if (tercero) {
            const ava3 = tercero.avatar ? (tercero.avatar.startsWith('http') ? tercero.avatar : `https://widlens.onrender.com${tercero.avatar}`) : `https://ui-avatars.com/api/?name=${tercero.nombre}&background=FDBA74`;
            podioHTML += `
                <div class="guardian-card bronze">
                    <div class="medal">🥉</div>
                    <img src="${ava3}" alt="Avatar" class="podium-avatar">
                    <h4 class="guardian-name">@${tercero.nombre}</h4>
                    <span class="guardian-score">${tercero.total_avistamientos} avistamientos</span>
                </div>`;
        }

        podioContainer.innerHTML = podioHTML;

    } catch (error) {
        console.error("Error cargando estadísticas y top:", error);
    }
}

// Función extra para hacer que los números suban de 0 al total con una animación
function animarContador(id, objetivo) {
    const elemento = document.getElementById(id);
    let inicio = 0;
    const duracion = 1500; // 1.5 segundos
    const incremento = objetivo / (duracion / 16); // Asumiendo 60fps

    function actualizar() {
        inicio += incremento;
        if (inicio < objetivo) {
            elemento.innerText = Math.ceil(inicio);
            requestAnimationFrame(actualizar);
        } else {
            elemento.innerText = objetivo;
        }
    }
    actualizar();
}