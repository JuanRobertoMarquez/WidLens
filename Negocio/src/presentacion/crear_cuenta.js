
const registroForm = document.querySelector('.registro-form');

    registroForm.addEventListener('submit', async function(e) {
    e.preventDefault(); 

    const nombre = document.getElementById('nombre').value;
    const apellido = document.getElementById('apellido').value;
    const correo = document.getElementById('correo').value;
    const contrasenia = document.getElementById('contrasenia').value;
    const confirmContrasenia = document.getElementById('confirm-contrasenia').value;

    if (contrasenia !== confirmContrasenia) {
        alert("Las contraseñas no coinciden. Por favor, verifícalas.");
        return;
    }

    try {
        // Hacemos la petición POST real a Node.js
        const respuesta = await fetch('https://widlens.onrender.com/api/registro', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre, apellido, correo, contrasenia })
        });

        const resultado = await respuesta.json();

        // Cuando la petición fetch responda que la cuenta se creó exitosamente:
        if (respuesta.ok) {
            window.location.href = './esperando_verificacion.html';
        } else {
            alert("Error al registrar: " + resultado.error);
        }
    } catch (error) {
        console.error("Error de red:", error);
        alert("No se pudo conectar con el servidor backend.");
    }
});