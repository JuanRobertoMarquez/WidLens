const formSolicitud = document.querySelector('.solicitud-form');

formSolicitud.addEventListener('submit', async function(e) {
    e.preventDefault(); 

    const correo = document.getElementById('correo').value;

    try {
        // Le pedimos a Node.js que busque el correo y envíe el enlace
        const respuesta = await fetch('https://widlens.onrender.com/api/recuperar-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ correo })
        });

        // por seguridad, sin importar si el correo existía en la BD o no.
        alert("Si el correo está registrado, recibirás un enlace con instrucciones.");
        window.location.href = '../login.html';

    } catch (error) {
        console.error("Error de red:", error);
        alert("No se pudo conectar con el servidor backend.");
    }
});