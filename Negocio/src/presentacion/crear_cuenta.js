async function cargarImagenFondo() {
    try {
        const respuesta = await fetch('https://widlens.onrender.com/api/login-imagen-aleatoria', {
            cache: 'no-store' 
        });
        
        if (respuesta.ok) {
            const datos = await respuesta.json();
            
            // Lógica corregida para la imagen de fondo
            let rutaFondo = datos.foto.startsWith('http') ? datos.foto : `https://widlens.onrender.com${datos.foto}`;
            document.getElementById('dynamic-bg').style.backgroundImage = `url('${rutaFondo}')`;
            
            document.getElementById('bg-especie').innerText = datos.especie_nombre || 'Especie por identificar';
            document.getElementById('bg-autor').innerText = datos.nombre_usuario;
            
            // Lógica corregida para el avatar
            const avatarImg = document.getElementById('bg-avatar');
            if (datos.avatar) {
                avatarImg.src = datos.avatar.startsWith('http') ? datos.avatar : `https://widlens.onrender.com${datos.avatar}`;
            } else {
                avatarImg.src = `https://ui-avatars.com/api/?name=${datos.nombre_usuario}&background=2B7055&color=fff`;
            }
        }
    } catch (error) {
        console.error("Error al cargar imagen dinámica.", error);
    }
}

cargarImagenFondo();

const registroForm = document.getElementById('registroForm');
const passInputCrear = document.getElementById('contrasenia');
const togglePassword = document.getElementById('togglePassword');
const toggleConfirmPassword = document.getElementById('toggleConfirmPassword');
const confirmPasswordInput = document.getElementById('confirmar_contrasenia');
const containerCrear = document.getElementById('strength-container-crear');
const barCrear = document.getElementById('strength-bar-crear');

togglePassword.addEventListener('click', () => {
    const isPassword = passInputCrear.type === 'password';
    passInputCrear.type = isPassword ? 'text' : 'password';

    togglePassword.querySelector('i').classList.toggle('fa-eye');
    togglePassword.querySelector('i').classList.toggle('fa-eye-slash');
});

toggleConfirmPassword.addEventListener('click', () => {
    const isPassword = confirmPasswordInput.type === 'password';
    confirmPasswordInput.type = isPassword ? 'text' : 'password';

    toggleConfirmPassword.querySelector('i').classList.toggle('fa-eye');
    toggleConfirmPassword.querySelector('i').classList.toggle('fa-eye-slash');
});

passInputCrear.addEventListener('input', function() {
    const val = this.value;
    // Mostrar la barrita solo si ya empezó a escribir
    containerCrear.style.visibility = val.length > 0 ? 'visible' : 'hidden';
    containerCrear.style.opacity = val.length > 0 ? '1' : '0';
    let score = 0;

    const checks = {
        'req-length-crear': val.length >= 8,
        'req-upper-crear': /[A-Z]/.test(val),
        'req-lower-crear': /[a-z]/.test(val),
        'req-number-crear': /\d/.test(val),
        'req-special-crear': /[\W_]/.test(val)
    };

    // Tachar los completados y sumar puntos
    for (const [id, isValid] of Object.entries(checks)) {
        const li = document.getElementById(id);
        if (li) {
            if (isValid) {
                li.classList.add('valid');
                score += 20; 
            } else {
                li.classList.remove('valid');
            }
        }
    }

    // Pintar la barra según el puntaje
    barCrear.style.width = score + '%';
    if (score <= 50) barCrear.style.backgroundColor = '#d33'; // Rojo
    else if (score === 75) barCrear.style.backgroundColor = '#f39c12'; // Naranja
    else barCrear.style.backgroundColor = '#2B7055'; // Verde
});

registroForm.addEventListener('submit', async function(e) {
    e.preventDefault();

    const nombre = document.getElementById('nombre').value.trim();
    const apellido = document.getElementById('apellido').value.trim();
    const correo = document.getElementById('correo').value.trim();
    const contrasenia = document.getElementById('contrasenia').value;
    const confirmarContrasenia = document.getElementById('confirmar_contrasenia').value;

    // 1. Validar que las contraseñas coincidan
    if (contrasenia !== confirmarContrasenia) {
        Swal.fire({
            title: 'Las contraseñas no coinciden',
            text: 'Por favor, asegúrate de escribir la misma contraseña en ambos campos.',
            icon: 'warning',
            confirmButtonColor: '#2B7055'
        });
        return;
    }

    // 2. Validación de fuerza de contraseña (Regex)
    const regexPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
    if (!regexPassword.test(contrasenia)) {
        Swal.fire({
            title: 'Contraseña débil',
            text: 'Debe tener mínimo 8 caracteres e incluir: 1 mayúscula, 1 minúscula, 1 número y 1 carácter especial.',
            icon: 'warning',
            confirmButtonColor: '#2B7055'
        });
        return;
    }

    // ==========================================================
    // NUEVO: CAPTURA Y VALIDACIÓN DEL TOKENS reCAPTCHA V2
    // ==========================================================
    const captchaToken = grecaptcha.getResponse();

    if (!captchaToken) {
        Swal.fire({
            title: '🌱 Registro Seguro',
            text: 'Por favor, demuestra que no eres un robot marcando la casilla del reCAPTCHA.',
            icon: 'warning',
            confirmButtonColor: '#2B7055'
        });
        return; // Detiene el flujo de envío por completo
    }

    // Cambiar el texto del botón mientras carga
    const btnSubmit = document.getElementById('btn-submit');
    const textoOriginal = btnSubmit.innerText;
    btnSubmit.innerText = 'Creando cuenta...';
    btnSubmit.disabled = true;

    try {
        // Hacemos la petición a la ruta mandando todos los campos e inyectando el token
        const respuesta = await fetch('https://widlens.onrender.com/api/registro', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                nombre, 
                apellido, 
                correo, 
                contrasenia,
                'g-recaptcha-response': captchaToken // <-- Enviamos el token de seguridad
            })
        });

        const resultado = await respuesta.json();

        if (respuesta.ok) {
            localStorage.setItem('correoRegistroTemporal', correo);
            // ¡Éxito! Lo mandamos a la pantalla del sobrecito
            window.location.href = 'esperando_verificacion.html'; 
        } else {
            // Error (ej. El correo ya existe o falló el captcha en el servidor)
            Swal.fire({
                title: 'Ups...',
                text: resultado.error || 'No se pudo crear la cuenta.',
                icon: 'error',
                confirmButtonColor: '#d33'
            });
            // Reseteamos el reCAPTCHA para que pueda volver a intentarlo con un token nuevo
            grecaptcha.reset();
            btnSubmit.innerText = textoOriginal;
            btnSubmit.disabled = false;
        }
    } catch (error) {
        console.error("Error de red:", error);
        Swal.fire({
            title: 'Error de conexión',
            text: 'Asegúrate de que el servidor esté encendido o comprueba tu conexión de red.',
            icon: 'error',
            confirmButtonColor: '#d33'
        });
        grecaptcha.reset();
        btnSubmit.innerText = textoOriginal;
        btnSubmit.disabled = false;
    }
});