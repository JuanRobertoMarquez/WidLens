document.addEventListener("DOMContentLoaded", () => {

// ==========================================
    // CARRUSEL DINÁMICO Y AUTOMÁTICO
    // ==========================================
    const track = document.getElementById("track");
    const prevBtn = document.getElementById("prevBtn");
    const nextBtn = document.getElementById("nextBtn");
    const carouselWrapper = document.querySelector('.carousel-wrapper'); // Contenedor principal
    
    const scrollAmount = 220; // Lo que avanza cada salto
    let autoPlayInterval; // Variable para controlar el ciclo

    const moveRight = () => {
        if (!track) return;
        
        // Comprobamos si el carrusel ya llegó al final derecho
        // (Le restamos 10px por los márgenes de error de los navegadores)
        if (track.scrollLeft + track.clientWidth >= track.scrollWidth - 10) {
            // Si llegó al final, regresa suavemente al inicio (Efecto infinito)
            track.scrollTo({ left: 0, behavior: "smooth" });
        } else {
            // Si no, sigue avanzando normal
            track.scrollBy({ left: scrollAmount, behavior: "smooth" });
        }
    };

    const moveLeft = () => {
        if (!track) return;
        
        // Si estamos en el principio y damos a la izquierda, lo mandamos al final
        if (track.scrollLeft === 0) {
            track.scrollTo({ left: track.scrollWidth, behavior: "smooth" });
        } else {
            track.scrollBy({ left: -scrollAmount, behavior: "smooth" });
        }
    };

   // Asignamos los clics manuales
    if(nextBtn) nextBtn.addEventListener("click", moveRight);
    if(prevBtn) prevBtn.addEventListener("click", moveLeft);
    // --- MAGIA AUTOMÁTICA ---
    // Función para arrancar el motor
    const iniciarCarrusel = () => {
        // Se ejecuta moveRight cada 2500 milisegundos (2.5 segundos)
        autoPlayInterval = setInterval(moveRight, 2500); 
    };

    // Arrancamos el carrusel cuando cargue la página
    iniciarCarrusel();

    // EXCELENTE PRÁCTICA UX: Pausar el carrusel si el usuario pone el mouse encima 
    // para que pueda leer de qué ajolote se trata sin que se le escape la tarjeta
    if (carouselWrapper) {
        carouselWrapper.addEventListener('mouseenter', () => {
            clearInterval(autoPlayInterval); // Pausa
        });
        
        carouselWrapper.addEventListener('mouseleave', () => {
            iniciarCarrusel(); // Vuelve a arrancar al quitar el mouse
        });
    }
    const counters = document.querySelectorAll('.counter');
    const speed = 200; 

    const animateCounters = () => {
        counters.forEach(counter => {
            const updateCount = () => {
                const target = +counter.getAttribute('data-target');
                const count = +counter.innerText;
                const inc = target / speed;

                if (count < target) {
                    counter.innerText = Math.ceil(count + inc);
                    setTimeout(updateCount, 15); 
                } else {
                    counter.innerText = target;
                }
            };
            updateCount();
        });
    };

    const observerOptions = {
        root: null,
        threshold: 0.5 
    };

    const statsObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateCounters(); 
                observer.unobserve(entry.target); 
            }
        });
    }, observerOptions);

    const statsSection = document.querySelector('.stats-section');
    if (statsSection) {
        statsObserver.observe(statsSection);
    }

});

// --- FUNCIÓN PARA CARGAR LA BD Y EL MAPA ---
async function cargarHistoriaReciente() {
    try {
        const respuesta = await fetch('http://127.0.0.1:3000/api/observacion-reciente');
        const datos = await respuesta.json();

        if (datos) {
            document.getElementById('nombre-usuario').innerText = datos.nombre_usuario;

            // --- ARREGLO DE IMÁGENES ---
            const imgPrincipal = document.getElementById('img-principal-obs');
            const iconoObs = document.getElementById('icono-obs');
            
            if (imgPrincipal && iconoObs) {
                // Como la BD ahora nos da "/uploads/foto.jpg", solo le pegamos la dirección de tu servidor
                const rutaSegura = 'http://127.0.0.1:3000' + datos.observacion_foto;
                const rutaIcono = 'http://127.0.0.1:3000' + datos.especie_imagen;
                
                imgPrincipal.src = rutaSegura;
                imgPrincipal.style.display = 'block';
                
                iconoObs.src = rutaIcono;
                iconoObs.style.display = 'block';
            }

            // --- NOMBRES ---
            if (datos.especie_nombre) {
                let partesNombre = datos.especie_nombre.split(' (');
                document.getElementById('nombre-comun-obs').innerText = partesNombre[0];
                if(partesNombre[1]) {
                    document.getElementById('nombre-cientifico-obs').innerText = partesNombre[1].replace(')', '');
                }
            }

            // --- FECHA ---
            const fechaObj = new Date(datos.fecha_avistamiento);
            const opcionesFecha = { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' };
            document.getElementById('fecha-obs').innerHTML = `<span class="clock-icon">🕒</span> ${fechaObj.toLocaleDateString('es-ES', opcionesFecha)}`;

            // --- TRADUCCIÓN DE COORDENADAS ---
            try {
                const resGeo = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${datos.latitud}&lon=${datos.longitud}`);
                const geoDatos = await resGeo.json();
                let lugar = geoDatos.address.city || geoDatos.address.town || geoDatos.address.state || "Ubicación silvestre";
                document.getElementById('texto-ubicacion').innerText = `📍 ${lugar}, México`;
            } catch (error) {
                document.getElementById('texto-ubicacion').innerText = `📍 Lat: ${datos.latitud}, Lng: ${datos.longitud}`;
            }

            // --- MAGIA: MINI MAPA CON LEAFLET ---
            const mapContainer = document.getElementById('mini-mapa');
            if(mapContainer) {
                const miniMap = L.map('mini-mapa', {
                    zoomControl: false,
                    attributionControl: false,
                    dragging: false, 
                    scrollWheelZoom: false, 
                    doubleClickZoom: false
                }).setView([datos.latitud, datos.longitud], 11);

                L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png').addTo(miniMap);
                L.marker([datos.latitud, datos.longitud]).addTo(miniMap);
            }
        }
    } catch (error) {
        console.error("Error al cargar la historia desde la BD:", error);
    }
}

async function cargarCarruselDinamico() {
    try {
        const respuesta = await fetch('http://127.0.0.1:3000/api/carrusel-observaciones');
        const datos = await respuesta.json();

        const trackCarrusel = document.getElementById('track');
        trackCarrusel.innerHTML = ''; // Limpiamos por si acaso

        if (datos && datos.length > 0) {
            datos.forEach(obs => {
                // Preparamos la ruta de la foto real (o de unsplash si es un dato viejo)
                let rutaFoto = obs.observacion_foto;
                if (!rutaFoto.startsWith('http')) {
                    rutaFoto = 'http://127.0.0.1:3000' + rutaFoto;
                }

                // Definimos el ícono y texto según el estatus
                let textoEstatus = obs.estatus_validacion === 'Validado' ? '✅ Verificado' : '📍 En revisión IA';

// Creamos la tarjeta HTML
                const tarjetaHTML = `
                    <div class="card">
                        <img src="${rutaFoto}" alt="${obs.especie_nombre}" style="width: 100%; height: 200px; object-fit: cover;">
                        <div class="card-info">
                            <h3>${obs.especie_nombre}</h3>
                            <p class="ai-status"><span>${textoEstatus}</span></p>
                        </div>
                    </div>
                `;

                // La inyectamos en el carrusel
                trackCarrusel.innerHTML += tarjetaHTML;
            });
        } else {
            trackCarrusel.innerHTML = '<p style="padding: 20px;">Aún no hay observaciones en la comunidad.</p>';
        }
    } catch (error) {
        console.error("Error al cargar el carrusel:", error);
    }
}

// AL FINAL DE TU ARCHIVO, LLAMA A LAS DOS FUNCIONES PARA QUE ARRANQUEN SOLAS:
cargarHistoriaReciente();
cargarCarruselDinamico();