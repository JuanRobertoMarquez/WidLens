// Arreglo que guarda los archivos seleccionados (máximo 3)
const photos = [null, null, null];
let activeSlot = null; // Slot que se va a rellenar

// Cuando el usuario hace click en un slot vacío o en el botón "Subir Fotos"
function triggerSlot(index) {
const slot = document.getElementById('slot' + index);
if (slot.classList.contains('has-image')) return; // si ya tiene foto, no hace nada
activeSlot = index;
document.getElementById('fileInput').click();
}

// Manejar los archivos seleccionados desde el input
function handleFiles(files) {
const fileArray = Array.from(files);
let processed = 0;

// Mostrar barra de progreso
const progressWrap = document.getElementById('progressWrap');
const progressFill = document.getElementById('progressFill');
progressWrap.classList.add('visible');
progressFill.style.width = '0%';

// Encontrar el primer slot vacío si se abrió desde el botón general
let slotIndex = activeSlot;

fileArray.forEach((file, i) => {
    if (!file.type.startsWith('image/')) return;

    // Buscar próximo slot vacío
    if (slotIndex === null || photos[slotIndex] !== null) {
        slotIndex = photos.indexOf(null);
        if (slotIndex === -1) { // No hay slots vacíos
            alert('Ya tienes 3 fotos. Elimina una para agregar otra.');
            return;
        }
    }

    const targetSlot = slotIndex;
    slotIndex = null; // siguiente archivo busca el próximo slot

    const reader = new FileReader();
    reader.onload = function(e) {
        photos[targetSlot] = e.target.result;
        renderSlot(targetSlot, e.target.result);
        processed++;
        // Actualizar barra de progreso
        progressFill.style.width = (processed / fileArray.length * 100) + '%';
        if (processed === fileArray.length) {
            setTimeout(() => {
                progressWrap.classList.remove('visible');
                progressFill.style.width = '0%';
            }, 600);
        }
        updateUI();
    };
    reader.readAsDataURL(file);
});

// Reset fileInput para permitir subir el mismo archivo de nuevo
document.getElementById('fileInput').value = '';
activeSlot = null;
}

// Renderizar la imagen en el slot correspondiente
function renderSlot(index, src) {
const slot = document.getElementById('slot' + index);
slot.innerHTML = `
    <img src="${src}" alt="Foto ${index + 1}">
    <button class="remove-btn" onclick="removePhoto(event, ${index})">✕</button>
`;
slot.classList.add('has-image');
// Quitar el onclick del slot para que no abra el explorador al hacer click en la foto
slot.onclick = null;
}

// Eliminar una foto de un slot
function removePhoto(event, index) {
event.stopPropagation();
photos[index] = null;
const slot = document.getElementById('slot' + index);
slot.innerHTML = `<span class="slot-icon">📷</span><button class="remove-btn" onclick="removePhoto(event, ${index})">✕</button>`;
slot.classList.remove('has-image');
slot.onclick = () => triggerSlot(index);
updateUI();
}

// Actualizar contador y botón Continuar
function updateUI() {
const count = photos.filter(p => p !== null).length;
document.getElementById('photoCount').textContent = count;
document.getElementById('btnContinuar').disabled = (count === 0);
}

// Drag & Drop
const uploadSection = document.getElementById('uploadSection');

uploadSection.addEventListener('dragover', (e) => {
e.preventDefault();
uploadSection.classList.add('dragover');
});

uploadSection.addEventListener('dragleave', () => {
uploadSection.classList.remove('dragover');
});

uploadSection.addEventListener('drop', (e) => {
e.preventDefault();
uploadSection.classList.remove('dragover');
activeSlot = null;
handleFiles(e.dataTransfer.files);
});

// Continuar al mapa (ajusta la ruta si es necesario)
function irAMapa() {
// Aquí puedes guardar las fotos en sessionStorage o pasarlas como querás
// Por ahora solo navega a la página del mapa
window.location.href = 'Mapa.html';
}

