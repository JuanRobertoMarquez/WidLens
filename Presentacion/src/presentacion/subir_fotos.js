/* =============================================
   LÓGICA: SUBIR FOTOS
   Archivo: Presentacion/src/presentacion/subir_fotos.js
============================================= */

// Arreglo que guarda las fotos (máximo 3)
const photos = [null, null, null];
let activeSlot = null;

// Abre el explorador de archivos para un slot específico
function triggerSlot(index) {
    const slot = document.getElementById('slot' + index);
    if (slot.classList.contains('has-image')) return;
    activeSlot = index;
    document.getElementById('fileInput').click();
}

// Maneja los archivos seleccionados
function handleFiles(files) {
    const fileArray = Array.from(files);
    let processed = 0;

    const progressWrap = document.getElementById('progressWrap');
    const progressFill = document.getElementById('progressFill');
    progressWrap.classList.add('visible');
    progressFill.style.width = '0%';

    let slotIndex = activeSlot;

    fileArray.forEach((file) => {
        if (!file.type.startsWith('image/')) return;

        if (slotIndex === null || photos[slotIndex] !== null) {
            slotIndex = photos.indexOf(null);
            if (slotIndex === -1) {
                alert('Ya tienes 3 fotos. Elimina una para agregar otra.');
                return;
            }
        }

        const targetSlot = slotIndex;
        slotIndex = null;

        const reader = new FileReader();
        reader.onload = function (e) {
            photos[targetSlot] = e.target.result;
            renderSlot(targetSlot, e.target.result);
            processed++;
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

    document.getElementById('fileInput').value = '';
    activeSlot = null;
}

// Muestra la imagen en el slot
function renderSlot(index, src) {
    const slot = document.getElementById('slot' + index);
    slot.innerHTML = `
        <img src="${src}" alt="Foto ${index + 1}">
        <button class="remove-btn" onclick="removePhoto(event, ${index})">✕</button>
    `;
    slot.classList.add('has-image');
    slot.onclick = null;
}

// Elimina una foto del slot
function removePhoto(event, index) {
    event.stopPropagation();
    photos[index] = null;
    const slot = document.getElementById('slot' + index);
    slot.innerHTML = `
        <span class="slot-icon">📷</span>
        <button class="remove-btn" onclick="removePhoto(event, ${index})">✕</button>
    `;
    slot.classList.remove('has-image');
    slot.onclick = () => triggerSlot(index);
    updateUI();
}

// Actualiza el contador y el botón Continuar
function updateUI() {
    const count = photos.filter(p => p !== null).length;
    document.getElementById('photoCount').textContent = count;
    document.getElementById('btnContinuar').disabled = (count === 0);
}

// Navega a la siguiente pantalla
function irAMapa() {
    window.location.href = 'Mapa.html';
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
