document.addEventListener('DOMContentLoaded', () => {
    // Configuramos el "Observador"
    const opciones = {
        root: null, // Usa el viewport del navegador
        threshold: 0.15, // Se activa cuando el 15% del elemento ya es visible
        rootMargin: "0px"
    };

    const observador = new IntersectionObserver((entradas, observador) => {
        entradas.forEach(entrada => {
            if (entrada.isIntersecting) {
                // Le agregamos la clase que ejecuta la transición CSS
                entrada.target.classList.add('animar-visible');
                // Dejamos de observarlo para que la animación solo ocurra una vez
                observador.unobserve(entrada.target);
            }
        });
    }, opciones);

    // Buscamos todos los elementos en el HTML que tengan la clase 'animar-oculto'
    const elementosAAnimar = document.querySelectorAll('.animar-oculto');
    
    elementosAAnimar.forEach(elemento => {
        observador.observe(elemento);
    });
});