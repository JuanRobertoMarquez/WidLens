const formRestablecer = document.querySelector('.reset-form');

formRestablecer.addEventListener('submit', async function(e) {
    e.preventDefault(); 

    // Tomamos los valores de los cuadros de texto
    const nuevacontrasenia = document.getElementById('nueva-contrasenia').value;
    const confirmcontrasenia = document.getElementById('confirm-contrasenia').value;

    // Verificamos que sean iguales
    if (nuevacontrasenia !== confirmcontrasenia) {
        alert("Las contraseñas no coinciden. Inténtalo de nuevo.");
        return;
    }

    // Extraemos el token gigante de la URL
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    if (!token) {
        alert("Enlace inválido o expirado. Vuelve a solicitar la recuperación.");
        return;
    }

    try {
        // Hacemos la petición a la Fase 3 (El Cerebro)
        const respuesta = await fetch('http://127.0.0.1:3000/api/restablecer-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, nuevaContrasenia: nuevacontrasenia })
        });

        const resultado = await respuesta.json();

        if (respuesta.ok) {
            alert("¡Contraseña actualizada con éxito!");
            window.location.href = 'login.html'; // Lo mandamos a iniciar sesión
        } else {
            alert("Error al restablecer: " + resultado.error);
        }
    } catch (error) {
        console.error("Error de red:", error);
        alert("No se pudo conectar con el servidor backend.");
    }
});