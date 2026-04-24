// 1. INICIALIZAMOS EL MAPA Y EL PIN
// Estas variables deben estar "sueltas" al principio para que cualquier función pueda verlas
const map = L.map('map').setView([19.4326, -99.1332], 14);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

// Aquí creamos el 'marker'. ¡Esto es lo que te faltaba!
const marker = L.marker([19.4326, -99.1332], {
    draggable: true 
}).addTo(map);

// Referencia al texto de la tarjeta flotante
const coordsDisplay = document.getElementById('coords-display');

// Evento al mover el pin
marker.on('dragend', function(event) {
    const position = marker.getLatLng();
    if (coordsDisplay) {
        coordsDisplay.innerHTML = `📍 Lat: ${position.lat.toFixed(5)}<br>Lng: ${position.lng.toFixed(5)}`;
    }
});


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