const formSolicitud = document.querySelector('.solicitud-form');

formSolicitud.addEventListener('submit', async function(e) {
    e.preventDefault(); 

    const correo = document.getElementById('correo').value;
    const btnEnviar = document.getElementById('btn-enviar');
    
    // Cambiamos el texto del botón mientras carga
    btnEnviar.innerText = 'Enviando...';
    btnEnviar.disabled = true;

    try {
        const respuesta = await fetch('https://widlens.onrender.com/api/recuperar-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ correo })
        });

        // Por seguridad, sin importar si el correo existía en la BD o no.
        Swal.fire({
            title: '¡Solicitud enviada!',
            text: 'Si el correo está registrado, recibirás un enlace con instrucciones en unos minutos.',
            icon: 'info',
            confirmButtonColor: '#2B7055'
        }).then(() => {
            window.location.href = 'login.html';
        });

    } catch (error) {
        console.error("Error de red:", error);
        Swal.fire({
            title: 'Error de Red',
            text: 'No se pudo conectar con el servidor backend.',
            icon: 'error',
            confirmButtonColor: '#d33'
        });
    } finally {
        btnEnviar.innerText = 'Enviar enlace';
        btnEnviar.disabled = false;
    }
});