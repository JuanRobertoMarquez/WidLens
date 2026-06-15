document.addEventListener("DOMContentLoaded", async () => {

    // --- 0. VERIFICAR SESIÓN BLINDADA ---
    const menuVisitante = document.getElementById('menu-visitante');
    const menuUsuario = document.getElementById('menu-usuario');
    const navNombre = document.getElementById('nav-nombre-usuario');
    const navAvatar = document.getElementById('nav-avatar');

    const usuarioString = localStorage.getItem('usuarioWildLens');

    const forzarModoVisitante = () => {
        localStorage.removeItem('usuarioWildLens'); 
        if (menuVisitante) menuVisitante.style.display = 'flex'; 
        if (menuUsuario) menuUsuario.style.display = 'none';
    };

    if (usuarioString && usuarioString !== "undefined" && usuarioString !== "null") {
        try {
            const usuarioLogueado = JSON.parse(usuarioString);
            
            if (!usuarioLogueado.id_usuario && !usuarioLogueado.correo) {
                forzarModoVisitante();
            } else {
                if (menuVisitante) menuVisitante.style.display = 'none';
                if (menuUsuario) menuUsuario.style.display = 'flex';
                
                if (navNombre) navNombre.innerText = usuarioLogueado.nombre || "Usuario";
                
                if (navAvatar && usuarioLogueado.avatar) {
                    navAvatar.src = usuarioLogueado.avatar.startsWith('http') 
                        ? usuarioLogueado.avatar 
                        : 'https://widlens.onrender.com' + usuarioLogueado.avatar;
                }
            }
        } catch (error) {
            console.warn("Datos de sesión corruptos en explorador. Limpiando.");
            forzarModoVisitante();
        }
    } else {
        forzarModoVisitante();
    }
    // ----------------------------------------------

    // 1. Inicializar el mapa con límites para XOCHIMILCO
    const limitesXochimilco = [
        [19.1850, -99.1350], // Suroeste
        [19.4500, -98.9900]  // Noreste 
    ];

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

    // 4. FETCH: Traer los datos reales
    try {
        const respuesta = await fetch('https://widlens.onrender.com/api/explorar-avistamientos');
        
        if (!respuesta.ok) {
            throw new Error(`HTTP error! status: ${respuesta.status}`);
        }

        const avistamientos = await respuesta.json();

        // --- LÓGICA DEL MODAL ---
        const modal = document.getElementById('modal-avistamiento');
        const btnCerrarModal = document.querySelector('.modal-close');

        if (btnCerrarModal) {
            btnCerrarModal.addEventListener('click', () => {
                modal.style.display = 'none';
            });
        }

        window.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });

        // 5. Recorrer los datos y poner marcadores
        avistamientos.forEach(animal => {
            let rutaFoto = animal.observacion_foto;
            if (rutaFoto && !rutaFoto.startsWith('http')) {
                rutaFoto = 'https://widlens.onrender.com' + rutaFoto;
            }

            const fechaObj = new Date(animal.fecha_avistamiento);
            const opcionesFecha = { day: 'numeric', month: 'long', year: 'numeric' };
            const fechaBonita = fechaObj.toLocaleDateString('es-ES', opcionesFecha);

            const marcador = L.marker([animal.latitud, animal.longitud], { icon: iconoAvistamiento }).addTo(map);

            // NUEVO: Agregamos "async" a la función del clic para poder traducir las coordenadas
            marcador.on('click', async () => {
                
                // Llenamos los datos básicos instantáneamente
                document.getElementById('modal-img').src = rutaFoto;
                document.getElementById('modal-especie').innerText = animal.especie_nombre;
                document.getElementById('modal-usuario').innerText = animal.nombre_usuario;
                document.getElementById('modal-fecha').innerText = fechaBonita;
                
                // Ponemos un mensaje de carga elegante mientras la API busca la calle
                const elementoCoordenadas = document.getElementById('modal-coords');
                elementoCoordenadas.innerHTML = "<em>Buscando dirección exacta... 🔎</em>";
                
                // Mostramos el modal de inmediato
                modal.style.display = 'flex';

                // Usamos la API de OpenStreetMap para traducir la latitud y longitud a texto
                try {
                    const resGeo = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${animal.latitud}&lon=${animal.longitud}`);
                    const geoDatos = await resGeo.json();
                    
                    if (geoDatos && geoDatos.display_name) {
                        // display_name trae todo: Calle, Colonia, Municipio, Estado, País y CP.
                        elementoCoordenadas.innerText = geoDatos.display_name;
                    } else {
                        // Si por algo no hay calles cerca (zona muy rural), dejamos las coordenadas
                        elementoCoordenadas.innerText = `Coordenadas: ${animal.latitud}, ${animal.longitud}`;
                    }
                } catch (error) {
                    console.error("Error al traducir las coordenadas:", error);
                    // Plan de respaldo si falla el internet
                    elementoCoordenadas.innerText = `Coordenadas: ${animal.latitud}, ${animal.longitud}`;
                }
            });
        });

    } catch (error) {
        console.error("Error al cargar los avistamientos:", error);
    }
});