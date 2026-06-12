// LÓGICA DE BARRITA EN TIEMPO REAL
const passInputRec = document.getElementById('nueva-contrasenia');
const containerRec = document.getElementById('strength-container-rec');
const barRec = document.getElementById('strength-bar-rec');

passInputRec.addEventListener('input', function() {
    const val = this.value;
    containerRec.style.display = val.length > 0 ? 'block' : 'none';

    let score = 0;
    const checks = {
        'req-upper-rec': /[A-Z]/.test(val),
        'req-lower-rec': /[a-z]/.test(val),
        'req-number-rec': /\d/.test(val),
        'req-special-rec': /[\W_]/.test(val)
    };

    for (const [id, isValid] of Object.entries(checks)) {
        const li = document.getElementById(id);
        if (isValid) {
            li.classList.add('valid');
            score += 25;
        } else {
            li.classList.remove('valid');
        }
    }

    barRec.style.width = score + '%';
    if (score <= 50) barRec.style.backgroundColor = '#d33';
    else if (score === 75) barRec.style.backgroundColor = '#f39c12';
    else barRec.style.backgroundColor = '#2B7055';
});

const formRestablecer = document.querySelector('.reset-form');

formRestablecer.addEventListener('submit', async function(e) {
    e.preventDefault(); 

    const nuevacontrasenia = document.getElementById('nueva-contrasenia').value;
    const confirmcontrasenia = document.getElementById('confirm-contrasenia').value;
    const btnGuardar = document.getElementById('btn-guardar');

    if (nuevacontrasenia !== confirmcontrasenia) {
        Swal.fire({
            title: 'Las contraseñas no coinciden',
            text: 'Por favor, asegúrate de escribir la misma contraseña en ambos campos.',
            icon: 'warning',
            confirmButtonColor: '#2B7055'
        });
        return;
    }

    const regexPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{1,8}$/;
    if (!regexPassword.test(nuevacontrasenia)) {
        Swal.fire({
            title: 'Contraseña débil',
            text: 'Debe tener máximo 8 caracteres e incluir: 1 mayúscula, 1 minúscula, 1 número y 1 carácter especial (ej. @, #, $, !).',
            icon: 'warning',
            confirmButtonColor: '#2B7055'
        });
        return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    if (!token) {
        Swal.fire({
            title: 'Enlace inválido',
            text: 'El enlace está incompleto o ya expiró. Vuelve a solicitar la recuperación.',
            icon: 'error',
            confirmButtonColor: '#d33'
        }).then(() => {
            window.location.href = 'solicitar_recuperacion.html';
        });
        return;
    }

    btnGuardar.innerText = 'Guardando...';
    btnGuardar.disabled = true;

    try {
        const respuesta = await fetch('https://widlens.onrender.com/api/restablecer-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, nuevaContrasenia: nuevacontrasenia })
        });

        const resultado = await respuesta.json();

        if (respuesta.ok) {
            Swal.fire({
                title: '¡Éxito!',
                text: 'Tu contraseña ha sido actualizada correctamente.',
                icon: 'success',
                confirmButtonColor: '#2B7055'
            }).then(() => {
                window.location.href = 'login.html'; 
            });
        } else {
            Swal.fire({
                title: 'Error',
                text: resultado.error || 'No se pudo restablecer la contraseña.',
                icon: 'error',
                confirmButtonColor: '#d33'
            });
        }
    } catch (error) {
        console.error("Error de red:", error);
        Swal.fire({
            title: 'Error de Red',
            text: 'No se pudo conectar con el servidor.',
            icon: 'error',
            confirmButtonColor: '#d33'
        });
    } finally {
        btnGuardar.innerText = 'Guardar contraseña';
        btnGuardar.disabled = false;
    }
});