// ==========================================
// FUNCIÓN MAESTRA: CERRAR SESIÓN
// ==========================================
function cerrarSesionGlobal() {
    Swal.fire({
        title: '¿Deseas salir de WildLens?',
        text: "Tendrás que volver a iniciar sesión para registrar avistamientos.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d9534f', // Rojo destructivo
        cancelButtonColor: '#2B7055',  // Verde WildLens
        confirmButtonText: 'Sí, cerrar sesión',
        cancelButtonText: 'Cancelar',
        backdrop: `rgba(23, 63, 47, 0.9)`, // Fondo del bosque
        background: '#F4F6EA'
    }).then((result) => {
        if (result.isConfirmed) {
            // 1. ¡EL PASO CRUCIAL! Borramos el usuario de la memoria
            localStorage.removeItem('usuarioWildLens');
            
            // 2. Opcional: Borramos cualquier otra cosa que hayas guardado
            sessionStorage.clear(); 

            // 3. Ahora sí, lo mandamos a la página principal
            // (Asegúrate de que esta ruta apunte bien a tu index.html dependiendo de dónde estés)
            window.location.href = '../login.html'; 
        }
    });
}