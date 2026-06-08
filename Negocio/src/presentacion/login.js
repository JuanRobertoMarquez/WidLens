async function cargarImagenFondo() {
    try {
        // El parámetro cache: 'no-store' obliga al navegador a pedir una foto nueva siempre
        const respuesta = await fetch('http://127.0.0.1:3000/api/login-imagen-aleatoria', {
            cache: 'no-store' 
        });
        
        if (respuesta.ok) {
            const datos = await respuesta.json();
            
            // 1. Cambiamos la imagen de fondo con la ruta correcta (datos.foto)
            document.getElementById('dynamic-bg').style.backgroundImage = `url('http://127.0.0.1:3000${datos.foto}')`;

            // 2. Actualizamos los textos (con seguro por si la especie es NULL)
            document.getElementById('bg-especie').innerText = datos.especie_nombre || 'Especie por identificar';
            document.getElementById('bg-autor').innerText = datos.nombre_usuario;                    
            
            // 3. Actualizamos el avatar del usuario
            const avatarImg = document.getElementById('bg-avatar');
            if (datos.avatar) {
                avatarImg.src = `http://127.0.0.1:3000${datos.avatar}`;
            } else {
                avatarImg.src = `https://ui-avatars.com/api/?name=${datos.nombre_usuario}&background=2B7055&color=fff`;
            }
        }
    } catch (error) {
        console.error("No se pudo cargar la imagen dinámica. Se usará la imagen por defecto.", error);
    }
}

// Ejecutamos la función apenas se abre la pantalla
cargarImagenFondo();

const loginForm = document.getElementById('loginForm');

loginForm.addEventListener('submit', async function(e) {
    e.preventDefault();

    // Preguntamos si la cajita fue marcada
    const respuestaRecaptcha = grecaptcha.getResponse();
    
    if (respuestaRecaptcha.length === 0) {
        // Si está vacía, detenemos todo y lanzamos alerta
        Swal.fire({
            title: 'Verificación requerida',
            text: 'Por favor, confirma que no eres un robot marcando la casilla.',
            icon: 'warning',
            confirmButtonColor: '#2B7055'
        });
        return; // Salimos de la función sin enviar datos al servidor
    }

    const correo = document.getElementById('correo').value;
    const contrasenia = document.getElementById('contrasenia').value;

    try {
        const respuesta = await fetch('http://127.0.0.1:3000/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ correo, contrasenia })
        });

        const resultado = await respuesta.json();

        if (resultado.exito) {
            localStorage.setItem('usuarioWildLens', JSON.stringify(resultado.usuario));
            localStorage.removeItem('usuario_activo'); 
            
            Swal.fire({
                title: `¡Bienvenido de vuelta, ${resultado.usuario.nombre}!`,
                text: '¿Listo para explorar y proteger la biodiversidad?',
                icon: 'success',
                confirmButtonColor: '#2B7055',
                confirmButtonText: 'Entrar',
                backdrop: `rgba(43, 112, 85, 0.2)` 
            }).then(() => {
                window.location.href = '../Index.html'; 
            });
        } else {
            // Si la contraseña es incorrecta, reiniciamos el reCAPTCHA por seguridad
            if (window.grecaptcha) grecaptcha.reset();

            Swal.fire({
                title: 'Acceso Denegado',
                text: resultado.mensaje,
                icon: 'error',
                confirmButtonColor: '#d33'
            });
        }
    } catch (error) {
        console.error("Error de red:", error);
        
        // También reiniciamos el reCAPTCHA si el servidor falló
        if (window.grecaptcha) grecaptcha.reset();

        Swal.fire({
            title: 'Error de Red',
            text: 'No se pudo conectar con el servidor central de WildLens.',
            icon: 'error',
            confirmButtonColor: '#d33'
        });
    }
});