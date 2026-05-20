// 1. Inicializar el mapa
const map = L.map('mapa-explorador', {
    zoomControl: false,
    attributionControl: false
}).setView([19.4326, -99.1332], 12); // Centrado en CDMX

// 2. Capa base del mapa (Estilo Calles por defecto)
L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}').addTo(map);

// 3. Simulación de Base de Datos (Datos Falsos)
const avistamientos = [
    {
        especie: "Cacomixtle Norteño",
        descripcion: "Visto trepando un árbol cerca de la facultad.",
        usuario: "Juan_Rob",
        fecha: "18 Mayo 2026",
        lat: 19.4978, 
        lng: -99.1269, // Zona Norte (cerca de ESCOM)
        imagen: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/Bassariscus_astutus.jpg/640px-Bassariscus_astutus.jpg"
    },
    {
        especie: "Halcón Peregrino",
        descripcion: "Descansando en una antena de la colonia.",
        usuario: "Bio_Ana",
        fecha: "15 Mayo 2026",
        lat: 19.4216, 
        lng: -99.1304, // Zona Centro
        imagen: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/86/Peregrine_Falcon_JdP_2005-12-21.jpg/640px-Peregrine_Falcon_JdP_2005-12-21.jpg"
    },
    {
        especie: "Tlacuache",
        descripcion: "Buscando comida en la madrugada en el parque.",
        usuario: "CarlosEco",
        fecha: "10 Mayo 2026",
        lat: 19.3452, 
        lng: -99.1765, // Zona Sur (Coyoacán)
        imagen: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/Opossum_2.jpg/640px-Opossum_2.jpg"
    }
];

// 4. Icono personalizado (Reutilizamos el verde tuyo)
const iconoAvistamiento = L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="background-color: #2B7055; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 3px 6px rgba(0,0,0,0.3);"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10]
});

// 5. Recorrer los datos y poner marcadores
avistamientos.forEach(animal => {
    // Estructura HTML de la pequeña tarjeta que se abre al dar clic
    const popupHTML = `
        <img src="${animal.imagen}" alt="${animal.especie}" class="popup-imagen">
        <div class="popup-info">
            <h3>${animal.especie}</h3>
            <p>${animal.descripcion}</p>
            <div class="popup-usuario">
                📸 Registrado por <strong>${animal.usuario}</strong> <br> 📅 ${animal.fecha}
            </div>
        </div>
    `;

    // Crear el marcador, asignarle el popup y añadirlo al mapa
    L.marker([animal.lat, animal.lng], { icon: iconoAvistamiento })
     .bindPopup(popupHTML)
     .addTo(map);
});