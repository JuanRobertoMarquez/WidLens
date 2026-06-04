const limitesMexico = [
    [14.5321, -118.3985], // Suroeste 
    [32.7187, -86.7104]   // Noreste 
];

// Inicializamos el mapa con las restricciones
const map = L.map('map', { 
    doubleClickZoom: false,
    attributionControl: false,  
    zoomControl: false,       
    maxBounds: limitesMexico,
    maxBoundsViscosity: 1.0,  
    minZoom: 5               
}).setView([19.4326, -99.1332], 14);
// Opción A: Mapa Básico (Calles claras estilo moderno)
const mapaBasico = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap &copy; CARTO',
    subdomains: 'abcd',
    maxZoom: 20
});

// Opción B: Mapa Detallado (Satélite)
const mapaSatelite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles &copy; Esri',
    maxZoom: 19
});

// NUEVO: Leemos si el usuario ya tenía una preferencia guardada
const mapaGuardado = localStorage.getItem('wildlens_mapa_preferido');

// Si guardó 'satelite', cargamos ese. Si no, cargamos el 'basico' por defecto.
if (mapaGuardado === 'satelite') {
    mapaSatelite.addTo(map);
    // IMPORTANTE: Resaltamos el botón correcto desde el inicio
    document.getElementById('btn-satelite').classList.add('active');
    document.getElementById('btn-basico').classList.remove('active');
} else {
    mapaBasico.addTo(map);
    // El botón de básico ya tiene la clase 'active' en el HTML por defecto
}

const capasBase = {
    "🗺️ Mapa Básico": mapaBasico,
    "🌍 Vista Satélite": mapaSatelite
};

function cambiarMapa(tipo) {
    map.removeLayer(mapaBasico);
    map.removeLayer(mapaSatelite);

    document.getElementById('btn-basico').classList.remove('active');
    document.getElementById('btn-satelite').classList.remove('active');

    if (tipo === 'basico') {
        mapaBasico.addTo(map);
        document.getElementById('btn-basico').classList.add('active');
    } else if (tipo === 'satelite') {
        mapaSatelite.addTo(map);
        document.getElementById('btn-satelite').classList.add('active');
    }

    // NUEVO: Guardamos la preferencia en la memoria del navegador
    localStorage.setItem('wildlens_mapa_preferido', tipo);
    document.getElementById('menu-mapas').classList.remove('mostrar');
}

const iconoPersonalizado = L.icon({
    iconUrl: '../images/sub_icon.png', 
    iconSize: [50, 55], 
    iconAnchor: [22, 45], 
    popupAnchor: [0, -45] 
});

// Creamos el marcador usando tu imagen
const marker = L.marker([19.4326, -99.1332], {
    draggable: true,
    icon: iconoPersonalizado 
}).addTo(map);

const coordsDisplay = document.getElementById('coords-display');

marker.on('dragend', function(event) {
    const position = marker.getLatLng();
    actualizarTarjeta(position.lat, position.lng);
});

async function guardarUbicacion() {
    const finalPosition = marker.getLatLng();

    const datosAvistamiento = {
        latitud: finalPosition.lat,
        longitud: finalPosition.lng,
        paso: 2
    };

    const btn = document.querySelector('.btn-confirmar');
    btn.innerText = "Guardando...";
    btn.disabled = true;

    try {
        // RECUERDA: Esta URL es de ejemplo, aquí irá la ruta a tu backend real
        const respuesta = await fetch('https://tu-servidor.com/api/avistamientos', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(datosAvistamiento)
        });

        if (respuesta.ok) {
            const resultado = await respuesta.json();
            console.log("Guardado exitoso:", resultado);
            alert('Ubicación guardada correctamente en el servidor.');
        } else {
            alert('Hubo un error al guardar. El servidor rechazó los datos.');
        }

    } catch (error) {
        console.error('Error de red:', error);
        alert('No se pudo conectar con el servidor.');
    } finally {
        btn.innerText = "Confirmar Ubicación";
        btn.disabled = false;
    }
}

// Guardamos el icono del pulso en una variable
const iconoUbicacionActual = L.divIcon({
    className: 'custom-div-icon',
    html: `
        <div class="custom-pin-container">
            <div class="wildlens-pulse"></div>
            <div class="wildlens-pin"></div>
        </div>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 15]
});

let marcadorUbicacion = null; 

function centrarEnMiUbicacion() {
    // Le pedimos a Leaflet que nos localice y haga zoom (flyTo)
    map.locate({setView: true, maxZoom: 16});
}

let circuloPrecision = null; 

// Evento: Cuando Leaflet encuentra la ubicación con éxito
map.on('locationfound', function(e) {
    // Borramos el pin animado y el círculo anterior (si existen)
    if (marcadorUbicacion) map.removeLayer(marcadorUbicacion);
    if (circuloPrecision) map.removeLayer(circuloPrecision);
    
    // 1. Colocamos el pin animado de WildLens en el centro
    marcadorUbicacion = L.marker(e.latlng, {
        icon: iconoUbicacionActual
    }).addTo(map);

    // 2. Dibujamos el círculo de precisión
    const radioError = e.accuracy; // Esto viene en metros
    circuloPrecision = L.circle(e.latlng, {
        color: '#2B7055',       // Borde verde WildLens
        fillColor: '#2B7055',   // Relleno verde
        fillOpacity: 0.15,      // 15% de opacidad para que se vea sutil
        weight: 1               // Borde muy delgado
    }).addTo(map);
});

// Evento: Si el usuario deniega los permisos de GPS o hay error
map.on('locationerror', function(e) {
    alert("No pudimos acceder a tu ubicación. Por favor verifica los permisos de tu navegador.");
});

// --- FUNCIONALIDAD: OCULTAR TARJETA AL MOVER EL MAPA ---
const infoCard = document.querySelector('.info-card');

// Cuando el usuario empieza a arrastrar o mover el mapa
map.on('movestart', function() {
    if (infoCard) {
        infoCard.classList.add('oculta');
    }
});

// Cuando el usuario suelta y el mapa se detiene
map.on('moveend', function() {
    if (infoCard) {
        infoCard.classList.remove('oculta');
    }
});

map.on('dblclick', function(event) {
    marker.setLatLng(event.latlng);
    map.flyTo(event.latlng, map.getZoom());
    actualizarTarjeta(event.latlng.lat, event.latlng.lng);
});

// --- FUNCIONALIDAD: BUSCADOR EN TIEMPO REAL (PHOTON API) ---
const inputBusqueda = document.getElementById('input-busqueda');
const listaResultados = document.getElementById('lista-resultados');
let temporizadorBusqueda;

inputBusqueda.addEventListener('input', function() {
    clearTimeout(temporizadorBusqueda); // Reinicia el tiempo si sigues escribiendo
    const query = this.value;

    // Solo buscamos si hay más de 2 letras
    if (query.length < 3) {
        listaResultados.innerHTML = '';
        listaResultados.classList.add('oculto');
        return;
    }

    // Efecto "Debounce": Esperamos 300ms después de que termines de teclear
    temporizadorBusqueda = setTimeout(async () => {
        try {
            // Hacemos la petición a la API gratuita de Photon. 
            // lon y lat ayudan a darle prioridad a lugares relevantes en el mapa
            const url = `https://photon.komoot.io/api/?q=${query}&lat=19.40&lon=-99.02&limit=5`;
            const respuesta = await fetch(url);
            const datos = await respuesta.json();

            listaResultados.innerHTML = ''; // Limpiamos lo anterior

            if (datos.features.length > 0) {
                listaResultados.classList.remove('oculto');
                
                datos.features.forEach(lugar => {
                    const props = lugar.properties;
                    const nombreLugar = props.name || props.street;
                    const ciudad = props.city || props.state || "";
                    const textoCompleto = ciudad ? `${nombreLugar}, ${ciudad}` : nombreLugar;

                    if (!nombreLugar) return; // Filtramos resultados vacíos

                    const li = document.createElement('li');
                    
                    // Expresión regular para poner en negritas la parte que escribiste
                    const regex = new RegExp(`(${query})`, "gi");
                    li.innerHTML = textoCompleto.replace(regex, "<strong>$1</strong>");
                    
                    li.onclick = () => {
                        const lng = lugar.geometry.coordinates[0];
                        const lat = lugar.geometry.coordinates[1];
                        
                        // Movemos el mapa y el marcador
                        map.flyTo([lat, lng], 16);
                        marker.setLatLng([lat, lng]);
                        
                        // Actualizamos la tarjeta inferior
                        if(coordsDisplay) {
                            coordsDisplay.innerHTML = `📍 Lat: ${lat.toFixed(5)}<br>Lng: ${lng.toFixed(5)}`;
                        }
                        
                        // Limpiamos el buscador
                        inputBusqueda.value = nombreLugar;
                        listaResultados.innerHTML = '';
                        listaResultados.classList.add('oculto');
                    };
                    
                    listaResultados.appendChild(li);
                });
            } else {
                listaResultados.classList.add('oculto');
            }
        } catch (error) {
            console.error("Error al buscar lugar:", error);
        }
    }, 300); 
});

// Función auxiliar para limpiar y ocultar la lista
function cerrarBuscador() {
    listaResultados.classList.add('oculto');
    listaResultados.innerHTML = '';
}

// Si el usuario hace clic en cualquier parte del mapa
map.on('click', cerrarBuscador);

// Si el usuario empieza a arrastrar el mapa
map.on('dragstart', cerrarBuscador);

// Si el usuario hace clic en cualquier lugar de la página que no sea el buscador
document.addEventListener('click', function(event) {
    const contenedorBuscador = document.querySelector('.buscador-custom');
    // Si el clic NO fue dentro del buscador, cerramos la lista
    if (!contenedorBuscador.contains(event.target)) {
        cerrarBuscador();
    }
});

// Si el usuario borra todo el texto presionando teclas (Backspace/Delete)
inputBusqueda.addEventListener('keyup', function(event) {
    if (this.value.length === 0) {
        cerrarBuscador();
    }
});

async function obtenerDireccion(lat, lng) {
    try {
        // Usamos la API oficial de OpenStreetMap
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;
        
        const respuesta = await fetch(url);
        if (!respuesta.ok) {
            throw new Error('Error al conectar con Nominatim');
        }

        const datos = await respuesta.json();

        // Nominatim guarda los datos dentro del objeto "address"
        if (datos && datos.address) {
            const calle = datos.address.road || datos.address.pedestrian || "";
            const ciudad = datos.address.city || datos.address.town || datos.address.county || "";
            
            let direccionFinal = "";
            if (calle && ciudad) direccionFinal = `${calle}, ${ciudad}`;
            else if (calle) direccionFinal = calle;
            else if (ciudad) direccionFinal = ciudad;
            else direccionFinal = "Área natural / Desconocida";

            return direccionFinal;
        }
        return "Ubicación sin registrar";

    } catch (error) {
        console.error("Error obteniendo la dirección:", error);
        return "Error de red";
    }
}

// Función auxiliar para actualizar la tarjeta visualmente
async function actualizarTarjeta(lat, lng) {
    if (coordsDisplay) {
        // Mostramos un texto de "Cargando" mientras consultamos la API
        coordsDisplay.innerHTML = `📍 Buscando ubicación exacto...<br><span style="font-size: 11px; color: #888; font-family: monospace;">Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)}</span>`;
        
        // Esperamos la respuesta de la dirección
        const direccion = await obtenerDireccion(lat, lng);
        
        // Actualizamos la tarjeta con el texto humano grande y las coordenadas en chiquito
        coordsDisplay.innerHTML = `📍 <strong>${direccion}</strong><br><span style="font-size: 11px; color: #888; font-family: monospace;">Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)}</span>`;
    }
}

// --- FUNCIONALIDAD: MENÚ DE ESTILOS DE MAPA ---
function toggleMenuMapas() {
    const menu = document.getElementById('menu-mapas');
    menu.classList.toggle('mostrar');
}

// --- FUNCIONALIDAD: COORDENADAS DEL MOUSE EN TIEMPO REAL ---
const coordsVivo = document.getElementById('coordenadas-en-vivo');

// El evento 'mousemove' se dispara cada que el cursor se mueve sobre el mapa
map.on('mousemove', function(event) {
    if (coordsVivo) {
        // Imprimimos la latitud y longitud exacta debajo de tu cursor
        coordsVivo.innerHTML = `Lat: ${event.latlng.lat.toFixed(5)} | Lng: ${event.latlng.lng.toFixed(5)}`;
    }
});