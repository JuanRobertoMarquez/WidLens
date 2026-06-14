document.addEventListener("DOMContentLoaded", () => {
    const btnAbrirCorreo = document.getElementById('btn-abrir-correo');

    if (btnAbrirCorreo) {
        btnAbrirCorreo.addEventListener('click', (e) => {
            // 1. Frenamos cualquier redirección automática a login o recarga de página
            e.preventDefault();

            // 2. Recuperamos el correo que guardamos en el registro
            const correoDestino = localStorage.getItem('correoRegistroTemporal') || "";
            const correoMinusculas = correoDestino.toLowerCase().trim();

            console.log("Intentando abrir correo para:", correoMinusculas); // Para que revises en la consola (F12)

            // 3. Evaluamos el dominio y abrimos la pestaña correcta
            if (correoMinusculas.includes('@hotmail.') || correoMinusculas.includes('@outlook.') || correoMinusculas.includes('@live.')) {
                window.open('https://outlook.live.com/mail/0/inbox', '_blank');
            } 
            else if (correoMinusculas.includes('@yahoo.')) {
                window.open('https://mail.yahoo.com', '_blank');
            } 
            else {
                // Por defecto para Gmail, correos institucionales de Google, etc.
                window.open('https://mail.google.com', '_blank');
            }
        });
    }
});