document.addEventListener("DOMContentLoaded", async () => {
    // 1. Saber quién está conectado usando LA MISMA variable del navbar
    const usuarioString = localStorage.getItem('usuarioWildLens');

    if (!usuarioString) {
        alert("Debes iniciar sesión para ver tu perfil.");
        window.location.href = '../login.html';
        return;
    }

    // Convertimos el texto a un objeto JavaScript
    const usuarioLogueado = JSON.parse(usuarioString);
    
    // AQUÍ ESTÁ EL CAMBIO CLAVE: Usamos id_usuario tal como viene de la base de datos
    const idUsuario = usuarioLogueado.id_usuario; 

    try {
        // 2. Pedir los datos a Node.js (Esto ya formará la URL correcta: /api/perfil/5)
        const respuesta = await fetch(`https://widlens.onrender.com/api/perfil/${idUsuario}`);
        const datos = await respuesta.json();
                
        if (respuesta.ok) {
// 3. Pintar los datos personales
            document.getElementById('ui-nombre').innerText = `${datos.datosPersonales.nombre} ${datos.datosPersonales.apellido}`;
            document.getElementById('ui-correo').innerText = datos.datosPersonales.correo;
            
            // --- NUEVO: PINTAR LA FOTO DE PERFIL ---
            if (datos.datosPersonales.avatar) {
                let rutaAvatar = datos.datosPersonales.avatar;
                if (!rutaAvatar.startsWith('http')) {
                    rutaAvatar = 'https://widlens.onrender.com' + rutaAvatar;
                }
                const imgPerfil = document.getElementById('avatar-perfil');
                if(imgPerfil) imgPerfil.src = rutaAvatar;
            }
            document.getElementById('ui-fotos').innerText = datos.totalObservaciones;

            // 2. Animales distintos: Extraemos los nombres y filtramos los repetidos
            const especiesUnicas = new Set();
            if (datos.historial && datos.historial.length > 0) {
                datos.historial.forEach(obs => {
                    especiesUnicas.add(obs.nombre_comun); // Set ignora automáticamente los duplicados
                });
            }
            // Imprimimos el tamaño del Set (cuántos animales únicos hay)
            document.getElementById('ui-total').innerText = especiesUnicas.size;

            // 4. Pintar la lista de observaciones
            const contenedorLista = document.getElementById('lista-observaciones');
            contenedorLista.innerHTML = ''; // Limpiamos el "Cargando..."

            if (datos.historial.length > 0) {
                datos.historial.forEach(obs => {
                    // Arreglar ruta de foto local
                    let rutaFoto = obs.foto;
                    if (!rutaFoto.startsWith('http')) {
                        rutaFoto = 'https://widlens.onrender.com' + rutaFoto;
                    }

                    // Darle formato a la fecha
                    const fechaObj = new Date(obs.fecha_avistamiento);
                    const fechaBonita = fechaObj.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });

                    // Clases dinámicas para el estatus (Verde o Naranja)
                    const claseEstatus = obs.estatus_validacion === 'Validado' ? 'estatus-badge' : 'estatus-badge estatus-pendiente';
                    const textoEstatus = obs.estatus_validacion === 'Validado' ? '✅ Validado' : '⏳ En revisión';

                    const itemHTML = `
                        <div class="obs-item">
                            <div class="obs-info-wrapper">
                                <img src="${rutaFoto}" class="obs-img" alt="Foto">
                                <div class="obs-text">
                                    <h4>${obs.nombre_comun}</h4>
                                    <p>📍 Registrado el ${fechaBonita}</p>
                                </div>
                            </div>
                            <div class="${claseEstatus}">${textoEstatus}</div>
                        </div>
                    `;
                    contenedorLista.innerHTML += itemHTML;
                });
            } else {
                contenedorLista.innerHTML = '<p style="color: #888; font-size: 14px;">Aún no has registrado ninguna observación. ¡Anímate a explorar el mapa!</p>';
            }
        } else {
            alert("Error al cargar perfil: " + datos.error);
        }

    } catch (error) {
        console.error("Error de red:", error);
        alert("No se pudo conectar con el servidor.");
    }
});