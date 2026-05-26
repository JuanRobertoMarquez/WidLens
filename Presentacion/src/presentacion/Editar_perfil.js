document.addEventListener("DOMContentLoaded", async () => {
    const idUsuario = localStorage.getItem('usuario_activo');

    // --- VALIDACIÓN DE SESIÓN INICIAL (Ahora con SweetAlert bonito) ---
    if (!idUsuario) {
        Swal.fire({
            title: '¡Oops!',
            text: "No detectamos tu nodo biométrico activo. Por favor inicia sesión.",
            icon: 'warning',
            confirmButtonColor: '#2B7055',
            confirmButtonText: 'Ir al Login'
        }).then(() => {
            window.location.href = 'login.html'; // Redirige DESPUÉS de que le den OK
        });
        return;
    }

    // 1. CARGAR DATOS ACTUALES (Desde Node.js)
    try {
        const respuesta = await fetch(`http://127.0.0.1:3000/api/perfil/${idUsuario}`);
        const datos = await respuesta.json();

        if (respuesta.ok) {
            // Llenamos los inputs
            document.getElementById('edit-nombre').value = datos.datosPersonales.nombre;
            document.getElementById('edit-apellido').value = datos.datosPersonales.apellido;
            document.getElementById('edit-correo').value = datos.datosPersonales.correo;
            
            // Si el usuario ya tiene un avatar personalizado en la BD, lo mostramos
            if(datos.datosPersonales.avatar) {
                let rutaAvatar = datos.datosPersonales.avatar;
                // Le agregamos la ruta del servidor local si no es url completa
                if (!rutaAvatar.startsWith('http')) {
                    rutaAvatar = 'http://127.0.0.1:3000' + rutaAvatar;
                }
                document.getElementById('preview-img').src = rutaAvatar;
            }
        }
    } catch (error) {
        console.error("Error cargando datos:", error);
    }

    // 2. PREVISUALIZAR FOTO NUEVA (Antes de subirla)
    const inputAvatar = document.getElementById('input-avatar');
    inputAvatar.addEventListener('change', function(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                // Actualizamos la imagen circular con la nueva previsualización
                document.getElementById('preview-img').src = e.target.result;
            }
            reader.readAsDataURL(file);
        }
    });

    // 3. GUARDAR CAMBIOS (Usando FormData para soportar la foto)
    const formEditar = document.getElementById('form-editar-perfil');
    
    formEditar.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const btnGuardar = document.getElementById('btn-guardar');
        // Pequeña micro-animación de carga en el botón
        btnGuardar.innerText = "Sincronizando...";
        btnGuardar.disabled = true;

        const empaqueDatos = new FormData();
        empaqueDatos.append('nombre', document.getElementById('edit-nombre').value);
        empaqueDatos.append('apellido', document.getElementById('edit-apellido').value);
        empaqueDatos.append('correo', document.getElementById('edit-correo').value);
        
        // Si seleccionó una nueva foto, la adjuntamos
        if (inputAvatar.files[0]) {
            empaqueDatos.append('avatar', inputAvatar.files[0]);
        }

        try {
            // Petición PUT al backend (¡Ojo con la URL!)
            const respuesta = await fetch(`http://127.0.0.1:3000/api/editar-perfil/${idUsuario}`, {
                method: 'PUT',
                body: empaqueDatos 
            });

            const resultado = await respuesta.json();

            if (respuesta.ok) {
                // Actualizamos el nombre en el navegador (localStorage) por si lo cambió
                localStorage.setItem('usuario_nombre', document.getElementById('edit-nombre').value + ' ' + document.getElementById('edit-apellido').value);
                
                // --- MENSAJE DE ÉXITO PREMIUM (SweeAlert2) ---
                Swal.fire({
                    title: '¡Sincronización Exitosa!',
                    text: 'Los datos de tu perfil se han actualizado en la red WildLens.',
                    icon: 'success',
                    confirmButtonColor: '#2B7055', /* Color WildLens */
                    confirmButtonText: 'Ver mi Perfil Nuevo',
                    backdrop: `rgba(17, 78, 55, 0.2)` /* Fondo verde sutil */
                }).then(() => {
                    // Esta redirección SOLO ocurre cuando el usuario hace clic en el botón
                    window.location.href = 'perfil.html'; 
                });

            } else {
                // Error reportado por el backend
                Swal.fire({
                    title: 'Oops...',
                    text: "Hubo un problema en la red: " + resultado.error,
                    icon: 'error',
                    confirmButtonColor: '#2B7055'
                });
            }
        } catch (error) {
            // Error de conexión (ej. servidor apagado)
            console.error("Error de red:", error);
            Swal.fire({
                title: 'Error de Red',
                text: "No pudimos conectar con el servidor central de WildLens.",
                icon: 'error',
                confirmButtonColor: '#2B7055'
            });
        } finally {
            // Revertimos el botón a su estado original
            btnGuardar.innerText = "Actualizar Perfil";
            btnGuardar.disabled = false;
        }
    });
});