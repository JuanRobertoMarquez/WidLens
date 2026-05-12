/* Lógica compartida para transiciones lentas y notorias */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Crear el elemento HTML de la transición si no existe
    if (!document.getElementById('transitionOverlay')) {
        const overlay = document.createElement('div');
        overlay.id = 'transitionOverlay';
        overlay.className = 'transition-overlay';
        document.body.appendChild(overlay);
    }

    const overlay = document.getElementById('transitionOverlay');

    // 2. Interceptar todos los enlaces que van a otras páginas del sitio
    const pageLinks = document.querySelectorAll('a[href$=".html"]');

    pageLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            // Evitar la navegación inmediata
            e.preventDefault(); 
            const destination = link.href;

            // Mostrar el mosaico de ajolotes
            overlay.classList.add('is-visible');

            // CAMBIO: Esperar 1.5 segundos (1s animación + 0.5s de pausa para apreciar el mosaico)
            setTimeout(() => {
                window.location.href = destination;
            }, 1500); 
        });
    });
});

/**
 * Función global para usar en redirecciones desde formularios JS
 */
function triggerSharedTransition(destination) {
    const overlay = document.getElementById('transitionOverlay');
    if (overlay) {
        overlay.classList.add('is-visible');
        
        // CAMBIO: Esperar 1.5 segundos aquí también
        setTimeout(() => {
            window.location.href = destination;
        }, 1500);
    } else {
        // Fallback si el overlay no se cargó
        window.location.href = destination;
    }
}