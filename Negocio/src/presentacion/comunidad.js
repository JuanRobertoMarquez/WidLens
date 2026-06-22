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
    // 1. Definimos las "Paredes Invisibles" de Xochimilco (Coordenadas Suroeste y Noreste)
    const limitesXochimilco = L.latLngBounds(
        L.latLng(19.1800, -99.1600), // Esquina inferior izquierda (Suroeste)
        L.latLng(19.3200, -98.9800)  // Esquina superior derecha (Noreste)
    );

    // 2. Inicializamos el mapa con los bloqueos activados
    map = L.map('mapa-comunidad', {
        center: [19.2550, -99.0800], // Centrado exactamente en la zona de canales
        zoom: 13,                    // Zoom inicial más cerca del agua
        minZoom: 12,                 // Tope para que no puedan alejarse y ver toda la CDMX
        maxBounds: limitesXochimilco,// Activamos la caja o pared invisible
        maxBoundsViscosity: 1.0      // 1.0 hace que la pared sea dura y no rebote
    });
    
    // Capa de OpenStreetMap
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
        const grid = document.getElementById('grid-observaciones');
        grid.innerHTML = '<p style="text-align:center; width:100%; color:#666;">Cargando avistamientos desde el servidor...</p>';

        const response = await fetch('https://widlens.onrender.com/api/observaciones/comunidad'); 
        
        if (!response.ok) throw new Error('Error al conectar con la base de datos');
        
        const datosReales = await response.json();
        observacionesGlobales = datosReales; 
        
        renderizarObservaciones(observacionesGlobales);
        actualizarPinesMapa(observacionesGlobales);

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
                        // Cambiamos a Photon, mucho más estable y sin bloqueos agresivos
                        const res = await fetch(`https://photon.komoot.io/reverse?lon=${obs.lng}&lat=${obs.lat}`);
                        const geoDatos = await res.json();
                        
                        if (geoDatos.features && geoDatos.features.length > 0) {
                            const props = geoDatos.features[0].properties;
                            // Photon organiza la info un poco diferente
                            let calleOAvenida = props.name || props.street || props.district || props.city || "Ubicación silvestre";
                            spanLoc.innerText = calleOAvenida;
                        } else {
                            spanLoc.innerText = "Área natural";
                        }
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
        
// ELIMINAMOS LAS FECHAS DUPLICADAS Y ACOMODAMOS EL BOTÓN
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
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                        <span id="${idUnicoLoc}" style="color: #666; font-size: 13px;">
                            📍 Lat: ${obs.lat ? parseFloat(obs.lat).toFixed(4) : 'N/A'}, Lng: ${obs.lng ? parseFloat(obs.lng).toFixed(4) : 'N/A'}
                        </span>
                        
                        ${(obs.lat && obs.lng) ? `<button class="btn-ver-calle" onclick="traducirCalle(${obs.lat}, ${obs.lng}, '${idUnicoLoc}', this)">Ver calle</button>` : ''}
                    </div>
                    
                    <span style="display: block; color: #888; font-size: 12px; margin-top: 5px;">
                        📅 ${obs.fecha ? new Date(obs.fecha).toLocaleDateString() : 'Fecha desconocida'}
                    </span>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
}

// TRADUCTOR DE CALLES BAJO DEMANDA (PHOTON API)
// ==========================================
async function traducirCalle(lat, lng, idElementoTexto, btnElemento) {
    const contenedorTexto = document.getElementById(idElementoTexto);
    
    contenedorTexto.innerHTML = `<em>Buscando zona... 🔎</em>`;
    btnElemento.style.display = 'none';

    try {
        const url = `https://photon.komoot.io/reverse?lon=${lng}&lat=${lat}`;
        const res = await fetch(url);
        
        if (!res.ok) throw new Error("Error de red");
        
        const geoDatos = await res.json();
        
        if (geoDatos.features && geoDatos.features.length > 0) {
            const props = geoDatos.features[0].properties;
            // Si encuentra un nombre de lugar, calle o distrito, lo usa.
            const calle = props.name || props.street || props.district || props.city || "Reserva Ecológica (Xochimilco)";
            contenedorTexto.innerHTML = `📍 <strong>${calle}</strong>`;
        } else {
            // Si la coordenada está en medio del agua y no hay calles cerca:
            contenedorTexto.innerHTML = `📍 <strong>Hábitat Natural (Canales)</strong>`;
        }
    } catch (error) { 
        // Si el internet falla, regresamos las coordenadas
        contenedorTexto.innerHTML = `📍 Lat: ${parseFloat(lat).toFixed(4)}, Lng: ${parseFloat(lng).toFixed(4)}`;
        btnElemento.style.display = 'inline-block';
    }
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

// ==========================================
// CARGAR ESTADÍSTICAS Y RANKING DINÁMICO
// ==========================================
async function cargarEstadisticasYPodio() {
    try {
        const response = await fetch('https://widlens.onrender.com/api/comunidad/stats-top');
        if (!response.ok) throw new Error('Error al conectar con la BD para stats');
        
        const datos = await response.json();

        animarContador('val-observaciones', datos.estadisticas.obs_totales || 0);
        animarContador('val-especies', datos.estadisticas.esp_identificadas || 0);
        animarContador('val-guardianes', datos.estadisticas.guard_activos || 0);

        const topDatos = datos.topGuardianes;
        const podioContainer = document.getElementById('contenedor-podio');
        podioContainer.innerHTML = '';

        if (topDatos.length === 0) {
            podioContainer.innerHTML = '<p style="color:#666;">Aún no hay guardianes registrados.</p>';
            return;
        }

        const primero = topDatos[0];
        const segundo = topDatos[1];
        const tercero = topDatos[2];

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

        const silverCard = document.querySelector('.guardian-card.silver');
        const bronzeCard = document.querySelector('.guardian-card.bronze');

        const lanzarConfeti = (elemento, coloresBase) => {
            const rect = elemento.getBoundingClientRect();
            const x = (rect.left + (rect.width / 2)) / window.innerWidth;
            const y = (rect.top + (rect.height / 2)) / window.innerHeight;

            confetti({
                particleCount: 150,      
                spread: 100,             
                startVelocity: 30,       
                origin: { x, y },        
                colors: coloresBase,     
                zIndex: 9999,
                ticks: 200               
            });
        };

        if (silverCard) {
            silverCard.addEventListener('mouseenter', () => {
                lanzarConfeti(silverCard, ['#C0C0C0', '#E2E8F0', '#ffffff', '#94A3B8']);
            });
        }
        
        if (bronzeCard) {
            bronzeCard.addEventListener('mouseenter', () => {
                lanzarConfeti(bronzeCard, ['#CD7F32', '#FDBA74', '#E58933', '#ffffff']);
            });
        }

    } catch (error) {
        console.error("Error cargando estadísticas y top:", error);
    }
}

// Función extra para hacer que los números suban de 0 al total con una animación
function animarContador(id, objetivo) {
    const elemento = document.getElementById(id);
    if (!elemento) return; 
    
    let inicio = 0;
    const duracion = 1500; 
    const incremento = objetivo / (duracion / 16); 

    function actualizar() {
        inicio += incremento;
        if (inicio < objetivo) {
            elemento.innerText = Math.ceil(inicio);
            requestAnimationFrame(actualizar);
        } else {
            elemento.innerText = objetivo;
        }
    }
    
    if (objetivo > 0) {
        actualizar();
    } else {
        elemento.innerText = "0";
    }
}