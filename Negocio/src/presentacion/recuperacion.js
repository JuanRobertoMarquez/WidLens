document.addEventListener("DOMContentLoaded", () => {
    
    // ==========================================
    // 1. SELECCIÓN DE ELEMENTOS DEL DOM
    // ==========================================
    const passInputRec = document.getElementById('nueva-contrasenia');
    const confirmInputRec = document.getElementById('confirm-contrasenia');

    const togglePassword = document.getElementById('togglePassword');
    const toggleConfirmPassword = document.getElementById('toggleConfirmPassword');

    const containerRec = document.getElementById('strength-container-rec');
    const barRec = document.getElementById('strength-bar-rec');
    
    const formRestablecer = document.querySelector('.reset-form');

    // ==========================================
    // 2. LÓGICA PARA LOS BOTONES DEL "OJITO"
    // ==========================================
    if (togglePassword && passInputRec) {
        togglePassword.addEventListener('click', () => {
            const isPassword = passInputRec.type === 'password';
            passInputRec.type = isPassword ? 'text' : 'password';

            const icon = togglePassword.querySelector('i');
            icon.classList.toggle('fa-eye');
            icon.classList.toggle('fa-eye-slash');
        });
    }

    if (toggleConfirmPassword && confirmInputRec) {
        toggleConfirmPassword.addEventListener('click', () => {
            const isPassword = confirmInputRec.type === 'password';
            confirmInputRec.type = isPassword ? 'text' : 'password';

            const icon = toggleConfirmPassword.querySelector('i');
            icon.classList.toggle('fa-eye');
            icon.classList.toggle('fa-eye-slash');
        });
    }

    // ==========================================
    // 3. LÓGICA DE LA BARRA DE FUERZA (SEGURIDAD)
    // ==========================================
    if (passInputRec && containerRec && barRec) {
        passInputRec.addEventListener('input', function() {
            const val = this.value;

            // Mostrar/Ocultar los requisitos dependiendo de si hay texto
            containerRec.style.visibility = val.length > 0 ? 'visible' : 'hidden';
            containerRec.style.opacity = val.length > 0 ? '1' : '0';
            
            let score = 0;

            const checks = {
                'req-length-rec': val.length >= 8,
                'req-upper-rec': /[A-Z]/.test(val),
                'req-lower-rec': /[a-z]/.test(val),
                'req-number-rec': /\d/.test(val),
                'req-special-rec': /[\W_]/.test(val)
            };

            for (const [id, isValid] of Object.entries(checks)) {
                const li = document.getElementById(id);
                if (li) {
                    if (isValid) {
                        li.classList.add('valid');
                        score += 20; // 20 puntos por cada requisito cumplido (Total 100)
                    } else {
                        li.classList.remove('valid');
                    }
                }
            }

            // Pintar la barra de color según el porcentaje
            barRec.style.width = score + '%';

            if (score <= 40) {
                barRec.style.backgroundColor = '#d33';     // Rojo
            } else if (score >= 60 && score < 100) {
                barRec.style.backgroundColor = '#f39c12';  // Naranja
            } else {
                barRec.style.backgroundColor = '#2B7055';  // Verde (El color de WildLens)
            }
        });
    }

    // ==========================================
    // 4. LÓGICA DE ENVÍO Y CONEXIÓN CON LA API
    // ==========================================
    if (formRestablecer) {
        formRestablecer.addEventListener('submit', async function(e) {
            e.preventDefault(); 

            const nuevacontrasenia = passInputRec.value;
            const confirmcontrasenia = confirmInputRec.value;
            const btnGuardar = document.getElementById('btn-guardar');

            // Validación: Contraseñas iguales
            if (nuevacontrasenia !== confirmcontrasenia) {
                Swal.fire({
                    title: 'Las contraseñas no coinciden',
                    text: 'Por favor, asegúrate de escribir la misma contraseña en ambos campos.',
                    icon: 'warning',
                    confirmButtonColor: '#2B7055'
                });
                return;
            }

            // Validación: Expresión Regular
            const regexPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
            if (!regexPassword.test(nuevacontrasenia)) {
                Swal.fire({
                    title: 'Contraseña débil',
                    text: 'Debe tener máximo 8 caracteres e incluir: 1 mayúscula, 1 minúscula, 1 número y 1 carácter especial (ej. @, #, $, !).',
                    icon: 'warning',
                    confirmButtonColor: '#2B7055'
                });
                return;
            }

            // Extraer el token de seguridad de la URL
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

            // Cambiar estado del botón mientras carga
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
                // Devolver el botón a su estado original si algo falla
                btnGuardar.innerText = 'Guardar contraseña';
                btnGuardar.disabled = false;
            }
        });
    }

});