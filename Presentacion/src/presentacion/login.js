document.getElementById('loginForm').addEventListener('submit', function(event) {
    // Evita que la página se recargue por defecto
    event.preventDefault(); 

    // Obtenemos los valores de los campos
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    // Aquí es donde harías la conexión real con tu backend (ej. Java Spring Boot)
    console.log('Intentando iniciar sesión con:', email);
    
    // Una alerta temporal para demostrar que funciona
    alert('¡Bienvenido! Validando credenciales para ' + email);
});