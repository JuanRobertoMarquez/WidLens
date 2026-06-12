document.addEventListener("DOMContentLoaded", async () => {

    // LÓGICA DEL CARRUSEL DE IMÁGENES (MOVIMIENTO)
    const track = document.getElementById("track");
    const prevBtn = document.getElementById("prevBtn");
    const nextBtn = document.getElementById("nextBtn");
    const carouselWrapper = document.querySelector('.carousel-wrapper'); 
    
    const scrollAmount = 220; 
    let autoPlayInterval; 

    const moveRight = () => {
        if (!track) return;
        if (track.scrollLeft + track.clientWidth >= track.scrollWidth - 10) {
            track.scrollTo({ left: 0, behavior: "smooth" });
        } else {
            track.scrollBy({ left: scrollAmount, behavior: "smooth" });
        }
    };

    const moveLeft = () => {
        if (!track) return;
        if (track.scrollLeft === 0) {
            track.scrollTo({ left: track.scrollWidth, behavior: "smooth" });
        } else {
            track.scrollBy({ left: -scrollAmount, behavior: "smooth" });
        }
    };

    if(nextBtn) nextBtn.addEventListener("click", moveRight);
    if(prevBtn) prevBtn.addEventListener("click", moveLeft);
    
    const iniciarCarrusel = () => { autoPlayInterval = setInterval(moveRight, 2500); };
    
    if (track) iniciarCarrusel(); // Solo arranca si el carrusel existe en la página

    // Pausar al pasar el mouse
    if (carouselWrapper) {
        carouselWrapper.addEventListener('mouseenter', () => clearInterval(autoPlayInterval));
        carouselWrapper.addEventListener('mouseleave', iniciarCarrusel);
    }

    // LÓGICA DE LAS ESTADÍSTICAS GLOBALES (Franja Verde)
    const statObservaciones = document.getElementById('stat-observaciones');
    const statEspecies = document.getElementById('stat-especies');
    const statGuardianes = document.getElementById('stat-guardianes');
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

    // Obtenemos los números reales de la BD antes de animar
    if (statObservaciones && statEspecies && statGuardianes) {
        try {
            const respuestaStats = await fetch('https://widlens.onrender.com/api/estadisticas');
            const stats = await respuestaStats.json();
            if (respuestaStats.ok) {
                statObservaciones.setAttribute('data-target', stats.total_observaciones || 0);
                statEspecies.setAttribute('data-target', stats.especies_identificadas || 0);
                statGuardianes.setAttribute('data-target', stats.guardianes_activos || 0);
            }
        } catch (error) { console.error("Error al cargar estadísticas:", error); }
    }

    // Observador para animar solo cuando el usuario baje a esa sección
    const observerOptions = { root: null, threshold: 0.5 };
    const statsObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateCounters(); 
                observer.unobserve(entry.target); 
            }
        });
    }, observerOptions);

    const statsSection = document.querySelector('.inat-stats-section');    
    if (statsSection) statsObserver.observe(statsSection);

    // 3. CARGAR TOP GUARDIANES (Medallas)
    const contenedorTop = document.getElementById('contenedor-top-guardianes');
    if (contenedorTop) {
        try {
            const respuestaTop = await fetch('https://widlens.onrender.com/api/top-guardianes');
            const topGuardianes = await respuestaTop.json();

            if (respuestaTop.ok && topGuardianes.length > 0) {
                contenedorTop.innerHTML = ''; 
                const clasesMedalla = ['badge-gold', 'badge-silver', 'badge-bronze'];
                const textosLugar = ['1º Lugar', '2º Lugar', '3º Lugar'];
                const emojisFallback = ['👨‍💻', '👩‍🔬', '🕵️‍♂️']; 

                topGuardianes.forEach((guardian, index) => {
                    let contenidoAvatar = '';
                    if (guardian.avatar) {
                        let rutaAvatar = guardian.avatar;
                        if (!rutaAvatar.startsWith('http')) rutaAvatar = 'https://widlens.onrender.com' + rutaAvatar;
                        contenidoAvatar = `<img src="${rutaAvatar}" alt="${guardian.nombre}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
                    } else {
                        contenidoAvatar = emojisFallback[index] || '👤';
                    }

                    contenedorTop.innerHTML += `
                        <div class="user-card">
                            <div class="avatar">${contenidoAvatar}</div>
                            <h4>${guardian.nombre}</h4>
                            <p>${guardian.total_observaciones} Observaciones</p>
                            <span class="badge ${clasesMedalla[index]}">${textosLugar[index]}</span>
                        </div>
                    `;
                });
            } else {
                contenedorTop.innerHTML = '<p style="color: #666; width: 100%; text-align: center;">Aún no hay suficientes registros.</p>';
            }
        } catch (error) {
            contenedorTop.innerHTML = '<p style="color: #d33; width: 100%; text-align: center;">Error de conexión con el servidor.</p>';
        }
    }

    // 4. EJECUTAR FUNCIONES DE CARGA DE DATOS
    cargarHistoriaReciente();
    cargarCarruselDinamico();
});
// 5. FUNCIÓN: HISTORIA RECIENTE Y MINI-MAPA
async function cargarHistoriaReciente() {
    try {
        const respuesta = await fetch('https://widlens.onrender.com/api/observacion-reciente');
        const datos = await respuesta.json();
        
        console.log("Datos recibidos de la API:", datos);

        if (datos && !datos.mensaje) { 
            
            // 1. USUARIO Y AVATAR
            const elNombreUsuario = document.getElementById('nombre-usuario');
            const elAvatarUsuario = document.getElementById('avatar-usuario');

            if(elNombreUsuario) elNombreUsuario.innerText = datos.nombre_usuario;
            if(elAvatarUsuario && datos.usuario_avatar) {
                elAvatarUsuario.src = 'https://widlens.onrender.com' + datos.usuario_avatar;
            }

            // 2. FOTOS DE LA OBSERVACIÓN E ÍCONO
            const imgPrincipal = document.getElementById('img-principal-obs');
            const iconoObs = document.getElementById('icono-obs');
            
            if (imgPrincipal && iconoObs) {
                // Validamos si ya trae el "http" de Cloudinary
                let rutaSegura = '';
                if (datos.observacion_foto) {
                    rutaSegura = datos.observacion_foto.startsWith('http') ? datos.observacion_foto : 'https://widlens.onrender.com' + datos.observacion_foto;
                }

                let rutaIcono = 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png';
                if (datos.especie_imagen) {
                    rutaIcono = datos.especie_imagen.startsWith('http') ? datos.especie_imagen : 'https://widlens.onrender.com' + datos.especie_imagen;
                }                
                imgPrincipal.src = rutaSegura;
                imgPrincipal.style.display = 'block';
                
                iconoObs.src = rutaIcono;
                iconoObs.style.display = 'block';
            }

            // 3. TEXTOS (Nombre común y científico)
            if (datos.especie_nombre) {
                let partesNombre = datos.especie_nombre.split(' (');
                const elNombreComun = document.getElementById('nombre-comun-obs');
                const elNombreCientifico = document.getElementById('nombre-cientifico-obs');
                
                if(elNombreComun) elNombreComun.innerText = partesNombre[0];
                if(elNombreCientifico && partesNombre[1]) {
                    elNombreCientifico.innerText = partesNombre[1].replace(')', '');
                }
            }

            // 4. FECHA
            if (datos.fecha_avistamiento) {
                const fechaObj = new Date(datos.fecha_avistamiento);
                const opcionesFecha = { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' };
                const elFechaObs = document.getElementById('fecha-obs');
                if (elFechaObs) elFechaObs.innerHTML = `<span class="clock-icon-inat">🕒</span> ${fechaObj.toLocaleDateString('es-ES', opcionesFecha)}`;
            }

            // 5. UBICACIÓN (Traducción de coordenadas a texto)
            const elTextoUbicacion = document.getElementById('texto-ubicacion');
            if (elTextoUbicacion) {
                try {
                    const resGeo = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${datos.latitud}&lon=${datos.longitud}`);
                    const geoDatos = await resGeo.json();
                    let lugar = geoDatos.address.city || geoDatos.address.town || geoDatos.address.state || "Ubicación silvestre";
                    elTextoUbicacion.innerText = `📍 ${lugar}, México`;
                } catch (error) {
                    elTextoUbicacion.innerText = `📍 Lat: ${datos.latitud}, Lng: ${datos.longitud}`;
                }
            }

            // 6. MINI-MAPA INTERACTIVO DE LEAFLET
            const mapContainer = document.getElementById('mini-mapa');
            if(mapContainer) {
                // Limpiar mapa anterior si existe (esto evita el error clásico de Leaflet de "Map container is already initialized")
                if (window.miniMapInstancia) window.miniMapInstancia.remove();
                
                window.miniMapInstancia = L.map('mini-mapa', {
                    zoomControl: false, attributionControl: false, dragging: false, 
                    scrollWheelZoom: false, doubleClickZoom: false
                }).setView([datos.latitud, datos.longitud], 11);

                L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png').addTo(window.miniMapInstancia);
                L.marker([datos.latitud, datos.longitud]).addTo(window.miniMapInstancia);
            }
        }
    } catch (error) {
        console.error("Error al cargar la historia desde la BD:", error);
    }
}

// 6. FUNCIÓN: CARRUSEL DINÁMICO (TARJETAS)
async function cargarCarruselDinamico() {
    try {
        const respuesta = await fetch('https://widlens.onrender.com/api/carrusel-observaciones');
        const datos = await respuesta.json();

        const trackCarrusel = document.getElementById('track');
        if(!trackCarrusel) return;
        trackCarrusel.innerHTML = ''; 

        if (datos && datos.length > 0) {
            datos.forEach(obs => {
                let rutaFoto = obs.observacion_foto;
                if (!rutaFoto.startsWith('http')) {
                    rutaFoto = 'https://widlens.onrender.com' + rutaFoto;
                }

                let textoEstatus = obs.estatus_validacion === 'Validado' ? '✅ Verificado' : '📍 En revisión IA';

                const tarjetaHTML = `
                    <div class="card">
                        <img src="${rutaFoto}" alt="${obs.especie_nombre}" style="width: 100%; height: 200px; object-fit: cover;">
                        <div class="card-info">
                            <h3>${obs.especie_nombre}</h3>
                            <p class="ai-status"><span>${textoEstatus}</span></p>
                        </div>
                    </div>
                `;
                trackCarrusel.innerHTML += tarjetaHTML;
            });
        } else {
            trackCarrusel.innerHTML = '<p style="padding: 20px;">Aún no hay observaciones en la comunidad.</p>';
        }
    } catch (error) {
        console.error("Error al cargar el carrusel:", error);
    }
}

// Ejecutar esto en cuanto cargue la página
document.addEventListener("DOMContentLoaded", () => {
    verificarSesion();
    // ... tus otras llamadas como cargarHistoriaReciente() ...
});

function verificarSesion() {
    const menuVisitante = document.getElementById('menu-visitante');
    const menuUsuario = document.getElementById('menu-usuario');
    const navNombreUsuario = document.getElementById('nav-nombre-usuario');
    const navAvatar = document.getElementById('nav-avatar');
    
    // NUEVO: Seleccionamos los botones que vamos a transformar
    const heroCta = document.getElementById('hero-cta');
    const newsletterCta = document.getElementById('newsletter-cta');

    // 1. Buscamos si hay datos de usuario guardados en el navegador
    const usuarioString = localStorage.getItem('usuarioWildLens');

    if (usuarioString) {
        // SÍ hay sesión iniciada
        const usuarioLogueado = JSON.parse(usuarioString);
        
        menuVisitante.style.display = 'none'; // Ocultamos el login
        menuUsuario.style.display = 'flex';   // Mostramos el menú desplegable
        
        // Inyectamos su nombre y su foto
        navNombreUsuario.innerText = usuarioLogueado.nombre;
        if (usuarioLogueado.avatar) {
            navAvatar.src = usuarioLogueado.avatar.startsWith('http') 
                ? usuarioLogueado.avatar 
                : 'https://widlens.onrender.com' + usuarioLogueado.avatar;
        }

        // NUEVO: Modificamos los botones para el usuario registrado
        if (heroCta) {
            heroCta.innerText = "Cargar nueva observación";
            heroCta.href = "./paginas/subir_fotos.html";
        }
        if (newsletterCta) {
            newsletterCta.innerText = "Explorar observaciones";
            newsletterCta.href = "./paginas/explorador.html";
        }

    } else {
        // NO hay sesión iniciada
        menuVisitante.style.display = 'flex'; // Cambiado a 'flex' para respetar tu CSS
        menuUsuario.style.display = 'none';    // Ocultamos el menú desplegable

        // NUEVO: Devolvemos los botones a su estado original (por si cierra sesión)
        if (heroCta) {
            heroCta.innerText = "Únete a la comunidad";
            heroCta.href = "./paginas/crear-cuenta.html";
        }
        if (newsletterCta) {
            newsletterCta.innerText = "Regístrate";
            newsletterCta.href = "./paginas/crear-cuenta.html";
        }
    }
}

// 2. Lógica para el botón de "Cerrar sesión"
const btnCerrarSesion = document.getElementById('btn-cerrar-sesion');
if(btnCerrarSesion) {
    btnCerrarSesion.addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('usuarioWildLens'); // Borramos los datos
        window.location.reload(); // Recargamos la página para volver al estado visitante
    });
}