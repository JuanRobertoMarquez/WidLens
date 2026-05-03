document.addEventListener("DOMContentLoaded", () => {

    const track = document.getElementById("track");
    const prevBtn = document.getElementById("prevBtn");
    const nextBtn = document.getElementById("nextBtn");
    const prevTop = document.getElementById("prevTop");
    const nextTop = document.getElementById("nextTop");

    const scrollAmount = 220; 

    const moveRight = () => {
        if(track) track.scrollBy({ left: scrollAmount, behavior: "smooth" });
    };

    const moveLeft = () => {
        if(track) track.scrollBy({ left: -scrollAmount, behavior: "smooth" });
    };

    if(nextBtn) nextBtn.addEventListener("click", moveRight);
    if(prevBtn) prevBtn.addEventListener("click", moveLeft);
    if(nextTop) nextTop.addEventListener("click", moveRight);
    if(prevTop) prevTop.addEventListener("click", moveLeft);

    const counters = document.querySelectorAll('.counter');
    const speed = 200; // Puedes bajar este número si quieres que la animación sea más rápida

    // Esta es la función que hace que los números suban
    const animateCounters = () => {
        counters.forEach(counter => {
            const updateCount = () => {
                // Obtenemos el número final del atributo data-target
                const target = +counter.getAttribute('data-target');
                // Obtenemos el número actual (empieza en 0)
                const count = +counter.innerText;
                
                // Calculamos de cuánto en cuánto va a subir
                const inc = target / speed;

                // Si el contador actual es menor que el objetivo, sumamos
                if (count < target) {
                    counter.innerText = Math.ceil(count + inc);
                    setTimeout(updateCount, 15); // Se repite cada 15 milisegundos
                } else {
                    // Para asegurarnos de que termine exactamente en el número objetivo
                    counter.innerText = target;
                }
            };
            updateCount();
        });
    };

    // Configuramos el "vigilante"
    const observerOptions = {
        root: null,
        threshold: 0.5 // Se activa cuando la mitad (50%) de la sección es visible
    };

    const statsObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            // Si la sección entra en la pantalla
            if (entry.isIntersecting) {
                animateCounters(); // Arranca la animación
                observer.unobserve(entry.target); // Deja de vigilar para que no se repita al subir y bajar
            }
        });
    }, observerOptions);

    // Le decimos al vigilante qué sección debe observar
    const statsSection = document.querySelector('.stats-section');
    if (statsSection) {
        statsObserver.observe(statsSection);
    }

});