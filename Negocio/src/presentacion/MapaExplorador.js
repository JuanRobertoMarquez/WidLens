document.addEventListener("DOMContentLoaded", async () => {

    // --- 0. VERIFICAR SESIÓN Y ACTUALIZAR NAVBAR ---
    const usuarioString = localStorage.getItem('usuarioWildLens');
    if (usuarioString) {
        const usuarioLogueado = JSON.parse(usuarioString);
        
        const menuVisitante = document.getElementById('menu-visitante');
        const menuUsuario = document.getElementById('menu-usuario');
        const navNombre = document.getElementById('nav-nombre-usuario');
        const navAvatar = document.getElementById('nav-avatar');

        if (menuVisitante) menuVisitante.style.display = 'none';
        if (menuUsuario) menuUsuario.style.display = 'flex';
        if (navNombre) navNombre.innerText = usuarioLogueado.nombre || "Usuario";
        if (navAvatar && usuarioLogueado.avatar) {
            navAvatar.src = usuarioLogueado.avatar.startsWith('http') 
                ? usuarioLogueado.avatar 
                : 'https://widlens.onrender.com' + usuarioLogueado.avatar;
        }
    }
    // ----------------------------------------------

    // 1. Inicializar el mapa con límites para XOCHIMILCO (Solución del borde superior)
    const limitesXochimilco = [
        [19.1850, -99.1350], // Suroeste
        [19.3500, -98.9900]  // Noreste (Subimos de 19.3000 a 19.3500 para darle "cielo" a los popups)
    ];

    // Inicializamos el mapa con las restricciones
    const map = L.map('mapa-explorador', { 
        doubleClickZoom: false,
        attributionControl: false, 
        zoomControl: false,       
        maxBounds: limitesXochimilco, 
        maxBoundsViscosity: 1.0,  
        minZoom: 12                
    }).setView([19.2550, -99.0850], 13);

    // 2. Capa base del mapa
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}').addTo(map);

    // 3. Icono personalizado
    const iconoAvistamiento = L.divIcon({
        className: 'custom-div-icon',
        html: `<div style="background-color: #2B7055; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 3px 6px rgba(0,0,0,0.3);"></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
    });

    // 4. FETCH: Traer los datos reales desde la BD a través de Node.js
    try {
        const respuesta = await fetch('https://widlens.onrender.com/api/explorar-avistamientos');
        
        if (!respuesta.ok) {
            throw new Error(`HTTP error! status: ${respuesta.status}`);
        }

        const avistamientos = await respuesta.json();

        // 5. Recorrer los datos y poner marcadores reales
        avistamientos.forEach(animal => {
            let rutaFoto = animal.observacion_foto;
            if (rutaFoto && !rutaFoto.startsWith('http')) {
                rutaFoto = 'https://widlens.onrender.com' + rutaFoto;
            }

            const fechaObj = new Date(animal.fecha_avistamiento);
            const opcionesFecha = { day: 'numeric', month: 'long', year: 'numeric' };
            const fechaBonita = fechaObj.toLocaleDateString('es-ES', opcionesFecha);

            const popupHTML = `
                <img src="${rutaFoto}" alt="${animal.especie_nombre}" class="popup-imagen" style="width: 100%; height: 140px; object-fit: cover; border-radius: 8px 8px 0 0;">
                <div class="popup-info" style="padding: 10px;">
                    <h3 style="margin: 0 0 5px 0; color: #2B7055; font-family: Montserrat;">${animal.especie_nombre}</h3>
                    <div class="popup-usuario" style="font-size: 12px; color: #555;">
                        📸 Registrado por <strong>${animal.nombre_usuario}</strong> <br> 📅 ${fechaBonita}
                    </div>
                </div>
            `;

// SOLUCIÓN: Aplicamos la clase CSS para que la tarjeta se abra hacia ABAJO
            L.marker([animal.latitud, animal.longitud], { icon: iconoAvistamiento })
             .bindPopup(popupHTML, {
                 className: 'popup-hacia-abajo', // Llama a nuestra magia de CSS
                 autoPanPadding: [20, 20]        // Le da un respiro a los bordes para que no se pegue a las orillas
             })
             .addTo(map);
        });

    } catch (error) {
        console.error("Error al cargar los avistamientos:", error);
    }
});