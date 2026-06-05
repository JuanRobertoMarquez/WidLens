document.addEventListener("DOMContentLoaded", async () => {
    // Agarramos los elementos de la pantalla para modificarlos
    const estadoDiv = document.getElementById('mensaje-estado');
    const btnContainer = document.getElementById('btn-login-container');

    // 1. Extraemos el token secreto que viene en el enlace del correo
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    // Si alguien entra a verificar.html sin un token, lo bloqueamos
    if (!token) {
        estadoDiv.innerHTML = `
            <h2 style="color: #e74c3c;"><i class="fas fa-times-circle"></i> Enlace inválido</h2>
            <p>No se encontró ningún código de verificación en el enlace.</p>
        `;
        return;
    }

    try {
        // 2. Hacemos la petición a la ruta GET que agregamos a tu backend
        const respuesta = await fetch(`http://127.0.0.1:3000/api/verificar-cuenta?token=${token}`);
        const resultado = await respuesta.json();

        if (respuesta.ok) {
            // 3. ¡Éxito! Evaluamos si es una verificación nueva o repetida
            const titulo = resultado.yaVerificada ? 'Cuenta ya verificada' : '¡Cuenta Verificada!';
            
            estadoDiv.innerHTML = `
                <h2 style="color: #2B7055;"><i class="fas fa-check-circle"></i> ${titulo}</h2>
                <p>${resultado.mensaje} Ya puedes acceder a tu cuenta de guardián.</p>
            `;
            // Mostramos el botón para que vaya a iniciar sesión
            btnContainer.style.display = 'block';
        } else {
            // Error (el token no existe o hubo un fallo técnico)
            estadoDiv.innerHTML = `
                <h2 style="color: #e74c3c;"><i class="fas fa-exclamation-triangle"></i> Hubo un problema</h2>
                <p>${resultado.error}</p>
            `;
        }
    } catch (error) {
        console.error("Error de red:", error);
        estadoDiv.innerHTML = `
            <h2 style="color: #e74c3c;"><i class="fas fa-wifi"></i> Error de conexión</h2>
            <p>No se pudo conectar con el servidor de WildLens. Verifica que el servidor esté encendido.</p>
        `;
    }
});