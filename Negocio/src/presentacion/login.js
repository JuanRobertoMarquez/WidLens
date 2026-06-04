document.getElementById('loginForm').addEventListener('submit', async function(event) {
    // 1. Evita que la página recargue por defecto o redirija mal
    event.preventDefault(); 

    // 2. Obtenemos los valores que el usuario escribió (OJO: Asegúrate de que tus inputs en HTML tengan estos IDs)
    const correoInput = document.getElementById('correo').value;
    const contraseniaInput = document.getElementById('contrasenia').value;

    try {
        // 3. Consultamos a tu servidor Node.js (Base de datos)
        const respuesta = await fetch('http://127.0.0.1:3000/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ correo: correoInput, contrasenia: contraseniaInput })
        });

        const datos = await respuesta.json();

        if (datos.exito) {
            // ¡ÉXITO! La base de datos confirmó que existe.
            
            // Limpiar variables viejas para evitar conflictos
            localStorage.removeItem('usuario_activo'); 

            // Guardamos la sesión real en el navegador
            localStorage.setItem('usuarioWildLens', JSON.stringify(datos.usuario));
            
            // Redirigimos al Index
            window.location.href = '../Index.html'; 
        } else {
            // Fracaso: Correo o contraseña incorrectos
            alert("Acceso denegado: " + datos.mensaje); 
        }
    } catch (error) {
        console.error("Error al iniciar sesión:", error);
        alert("Error de conexión con el servidor de WildLens.");
    }
});