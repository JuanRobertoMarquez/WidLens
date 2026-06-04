document.addEventListener("DOMContentLoaded", () => {
    
    // 1. Validar sesión y cargar Navbar
    const usuarioString = localStorage.getItem('usuarioWildLens');
    if (!usuarioString) {
        window.location.href = 'login.html';
        return;
    }
    
    const usuarioLogueado = JSON.parse(usuarioString);
    const idUsuario = usuarioLogueado.id_usuario || usuarioLogueado.id;

    // --- NUEVO: PINTAR DATOS EN EL NAVBAR ---
    const navNombre = document.getElementById('nav-nombre-usuario');
    const navAvatar = document.getElementById('nav-avatar');

    if (navNombre) navNombre.innerText = usuarioLogueado.nombre;
    
    if (navAvatar && usuarioLogueado.avatar) {
        let rutaAvatar = usuarioLogueado.avatar;
        // Le agregamos la ruta del servidor si viene directo de la BD
        if (!rutaAvatar.startsWith('http')) {
            rutaAvatar = 'http://127.0.0.1:3000' + rutaAvatar;
        }
        navAvatar.src = rutaAvatar;
    }
    // Elementos del DOM
    const statObs = document.getElementById('stat-obs');
    const statEsp = document.getElementById('stat-esp');
    const statVal = document.getElementById('stat-val');
    const contenedor = document.getElementById('contenedor-cuadricula');
    
    // Función central para buscar y pintar
    async function cargarDashboard(terminoBusqueda = '') {
        try {
            // Construimos la URL con el ID y el posible filtro de búsqueda
            let url = `http://127.0.0.1:3000/api/mis-observaciones/${idUsuario}`;
            if (terminoBusqueda) url += `?q=${encodeURIComponent(terminoBusqueda)}`;

            const respuesta = await fetch(url);
            const datos = await respuesta.json();

            if (respuesta.ok) {
                // Actualizar la barra oscura superior
                statObs.innerText = datos.estadisticas.observaciones;
                statEsp.innerText = datos.estadisticas.especies;
                statVal.innerText = datos.estadisticas.validados;

                // Limpiar la cuadrícula
                contenedor.innerHTML = '';

                if (datos.observaciones.length === 0) {
                    contenedor.innerHTML = `<p class="mensaje-carga">No se encontraron resultados.</p>`;
                    return;
                }

                // Pintar cada tarjeta en la cuadrícula
                datos.observaciones.forEach(obs => {
                    // Formatear la fecha a un formato legible
                    const fechaBonita = new Date(obs.fecha_avistamiento).toLocaleDateString('es-MX', {
                        year: 'numeric', month: 'short', day: 'numeric'
                    });

                    // Manejar la ruta de la foto y el estatus
                    const rutaFoto = obs.foto ? `http://127.0.0.1:3000${obs.foto}` : '/Presentacion/images/placeholder.png';
                    const claseEstatus = obs.estatus_validacion === 'Validado' ? 'validado' : 'pendiente';

                    // --- SOLUCIÓN AQUÍ: Convertimos texto a número de forma segura ---
                    // Si hay latitud, la convierte a número y le pone 4 decimales. Si no, pone "N/D" (No Disponible).
                    const latFormat = obs.latitud ? parseFloat(obs.latitud).toFixed(4) : "N/D";
                    const lngFormat = obs.longitud ? parseFloat(obs.longitud).toFixed(4) : "N/D";

                    const cardHTML = `
                        <div class="obs-card">
                            <div class="obs-img-wrapper">
                                <span class="badge-estatus ${claseEstatus}">${obs.estatus_validacion}</span>
                                <img src="${rutaFoto}" alt="${obs.nombre_comun}">
                            </div>
                            <div class="obs-detalles">
                                <h4 class="obs-titulo">${obs.nombre_comun}</h4>
                                <p class="obs-fecha">📅 ${fechaBonita}</p>
                                <p class="obs-coords">📍 Lat: ${latFormat}, Lng: ${lngFormat}</p>
                            </div>
                        </div>
                    `;
                    contenedor.innerHTML += cardHTML;
                });
            }
        } catch (error) {
            console.error("Error al cargar dashboard:", error);
            contenedor.innerHTML = `<p class="mensaje-carga" style="color:red;">Error de conexión con BioNode.</p>`;
        }
    }

    // Carga inicial al entrar a la página
    cargarDashboard();

    // Evento para el botón de búsqueda
    document.getElementById('btn-buscar').addEventListener('click', () => {
        const busqueda = document.getElementById('input-filtro').value;
        cargarDashboard(busqueda);
    });

    // Evento para buscar si el usuario presiona "Enter" en el input
    document.getElementById('input-filtro').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            cargarDashboard(e.target.value);
        }
    });

});