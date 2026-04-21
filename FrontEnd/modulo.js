document.addEventListener('DOMContentLoaded', () => {
    const track = document.getElementById('track');
    
    // Botones laterales
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    
    // Botones superiores (junto al título)
    const prevTop = document.getElementById('prevTop');
    const nextTop = document.getElementById('nextTop');

    // Cantidad de píxeles a desplazar con cada clic
    const scrollAmount = 250;

    function scrollLeft() {
        track.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    }

    function scrollRight() {
        track.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }

    // Asignamos la función a los botones correspondientes
    if (prevBtn) prevBtn.addEventListener('click', scrollLeft);
    if (prevTop) prevTop.addEventListener('click', scrollLeft);
    
    if (nextBtn) nextBtn.addEventListener('click', scrollRight);
    if (nextTop) nextTop.addEventListener('click', scrollRight);
});