// Desactivamos el doubleClickZoom para poder usar el doble clic para nuestro pin
const map = L.map('map', { doubleClickZoom: false }).setView([19.4326, -99.1332], 14);

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

// 4. CREAMOS EL CONTROL PARA CAMBIAR DE MAPA (Abajo a la izquierda)
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
}

// --- 1. ICONO PERSONALIZADO (El Pin Principal) ---
const iconoPersonalizado = L.icon({
    iconUrl: '../images/sub_icon.png', // <-- PON AQUÍ LA RUTA A TU IMAGEN REAL
    iconSize: [45, 45], // Tamaño de la imagen (ancho, alto)
    iconAnchor: [22, 45], // El punto exacto que apunta a la coordenada (la mitad inferior)
    popupAnchor: [0, -45] // Por si luego le quieres poner un mensajito encima
});

// Creamos el marcador usando tu imagen
const marker = L.marker([19.4326, -99.1332], {
    draggable: true,
    icon: iconoPersonalizado 
}).addTo(map);

const coordsDisplay = document.getElementById('coords-display');

marker.on('dragend', function(event) {
    const position = marker.getLatLng();
    if (coordsDisplay) {
        coordsDisplay.innerHTML = `📍 Lat: ${position.lat.toFixed(5)}<br>Lng: ${position.lng.toFixed(5)}`;
    }
});

// Y luego tu función async function guardarUbicacion() ...


// 2. FUNCIÓN DE GUARDADO (LA API)
async function guardarUbicacion() {
    // Como 'marker' ya se creó arriba, esta línea ya no dará error
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

// --- 2. LÓGICA DE MI UBICACIÓN (Con efecto pulso) ---

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

let marcadorUbicacion = null; // Variable para guardar el pin del pulso

// Función que se ejecuta al darle clic al botón 📍
function centrarEnMiUbicacion() {
    // Le pedimos a Leaflet que nos localice y haga zoom (flyTo)
    map.locate({setView: true, maxZoom: 16});
}

// Evento: Cuando Leaflet encuentra la ubicación con éxito
map.on('locationfound', function(e) {
    // Si ya existía un pin de ubicación previa, lo borramos para no hacer spam
    if (marcadorUbicacion) {
        map.removeLayer(marcadorUbicacion);
    }
    
    // Colocamos el pin animado en la coordenada real del usuario
    marcadorUbicacion = L.marker(e.latlng, {
        icon: iconoUbicacionActual
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

// --- FUNCIONALIDAD: DOBLE CLIC PARA MOVER EL PIN ---
map.on('dblclick', function(event) {
    // 1. Movemos el marcador a donde se hizo doble clic
    marker.setLatLng(event.latlng);
    
    // 2. Opcional: Centramos el mapa en ese nuevo punto de forma suave
    map.flyTo(event.latlng, map.getZoom());

    // 3. Actualizamos el texto de las coordenadas en la tarjeta
    if (coordsDisplay) {
        coordsDisplay.innerHTML = `📍 Lat: ${event.latlng.lat.toFixed(5)}<br>Lng: ${event.latlng.lng.toFixed(5)}`;
    }
});