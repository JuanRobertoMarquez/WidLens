document.addEventListener("DOMContentLoaded", async () => {
// 1. Inicializar el mapa con límites estrictos para México
    const limitesMexico = [
        [14.5321, -118.3985], // Suroeste (Pacífico)
        [32.7187, -86.7104]   // Noreste (Caribe/Frontera)
    ];
 // Inicializamos el mapa con las restricciones
const map = L.map('mapa-explorador', { 
    doubleClickZoom: false,
    attributionControl: false, // <-- ESTA LÍNEA OCULTA "Leaflet 
    zoomControl: false,       // <-- ESTA ES LA LÍNEA 
    maxBounds: limitesMexico, // El corral invisible
    maxBoundsViscosity: 1.0,  // Hace que el mapa rebote como pared sólida
    minZoom: 5                // Evita que alejen la cámara hasta ver todo el mundo
}).setView([19.4326, -99.1332], 11);

    // 2. Capa base del mapa (Tu estilo Calles por defecto)
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}').addTo(map);

    // 3. Icono personalizado (Tu diseño verde original)
    const iconoAvistamiento = L.divIcon({
        className: 'custom-div-icon',
        html: `<div style="background-color: #2B7055; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 3px 6px rgba(0,0,0,0.3);"></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
    });

    // 4. FETCH: Traer los datos reales desde la BD a través de Node.js
    try {
        const respuesta = await fetch('http://127.0.0.1:3000/api/explorar-avistamientos');
        
        if (!respuesta.ok) {
            throw new Error(`HTTP error! status: ${respuesta.status}`);
        }

        const avistamientos = await respuesta.json();

        // 5. Recorrer los datos y poner marcadores reales
        avistamientos.forEach(animal => {
            // Aseguramos que la ruta de la imagen apunte a tu servidor si es un archivo local
            let rutaFoto = animal.observacion_foto;
            if (rutaFoto && !rutaFoto.startsWith('http')) {
                rutaFoto = 'http://127.0.0.1:3000' + rutaFoto;
            }

            // Formatear la fecha para que se lea natural (Ej: "15 Mayo 2026")
            const fechaObj = new Date(animal.fecha_avistamiento);
            const opcionesFecha = { day: 'numeric', month: 'long', year: 'numeric' };
            const fechaBonita = fechaObj.toLocaleDateString('es-ES', opcionesFecha);

            // Estructura HTML de la pequeña tarjeta que se abre al dar clic (Mantuve tu diseño)
            const popupHTML = `
                <img src="${rutaFoto}" alt="${animal.especie_nombre}" class="popup-imagen" style="width: 100%; height: 140px; object-fit: cover; border-radius: 8px 8px 0 0;">
                <div class="popup-info" style="padding: 10px;">
                    <h3 style="margin: 0 0 5px 0; color: #2B7055; font-family: Montserrat;">${animal.especie_nombre}</h3>
                    <div class="popup-usuario" style="font-size: 12px; color: #555;">
                        📸 Registrado por <strong>${animal.nombre_usuario}</strong> <br> 📅 ${fechaBonita}
                    </div>
                </div>
            `;

            // Crear el marcador, asignarle el popup y añadirlo al mapa
            // Usamos las coordenadas reales de la base de datos (animal.latitud y animal.longitud)
            L.marker([animal.latitud, animal.longitud], { icon: iconoAvistamiento })
             .bindPopup(popupHTML)
             .addTo(map);
        });

    } catch (error) {
        console.error("Error al cargar los avistamientos:", error);
        alert("No se pudieron cargar los datos del servidor. Asegúrate de que Node.js esté corriendo.");
    }
});