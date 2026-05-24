// ==========================================
// 1. VARIABLES GLOBALES
// ==========================================
let currentPhoto = null;
const CLASES_ANIMALES = ["Ajolote"]; // Nota: Asegúrate de que tu modelo .h5 tenga solo 1 salida, o agrega las demás clases aquí.

// ==========================================
// 2. FUNCIONES DE LA INTERFAZ (SUBIR IMAGEN)
// ==========================================

// Cuando el usuario hace click en el slot vacío
function triggerSlot(index) {
    const slot = document.getElementById('slot0');
    if (slot.classList.contains('has-image')) return; 
    document.getElementById('fileInput').click();
}

// Manejar el archivo seleccionado (Se llama desde el HTML)
function handleFiles(files) {
    if (files.length === 0) return;
    const file = files[0]; // Forzamos a tomar solo el primer archivo

    if (!file.type.startsWith('image/')) {
        alert('Por favor, selecciona una imagen válida.');
        return;
    }

    // Mostrar barra de progreso
    const progressWrap = document.getElementById('progressWrap');
    const progressFill = document.getElementById('progressFill');
    if (progressWrap) progressWrap.classList.add('visible');
    if (progressFill) progressFill.style.width = '50%'; 

    const reader = new FileReader();
    reader.onload = function(e) {
        currentPhoto = e.target.result;
        renderSlot(e.target.result);
        
        if (progressFill) progressFill.style.width = '100%';
        setTimeout(() => {
            if (progressWrap) progressWrap.classList.remove('visible');
            if (progressFill) progressFill.style.width = '0%';
        }, 600);
    };
    reader.readAsDataURL(file);

    // Resetear el input oculto
    document.getElementById('fileInput').value = '';
}

// Renderizar la imagen en el recuadro visual
function renderSlot(src) {
    const slot = document.getElementById('slot0');
    slot.innerHTML = `
        <img src="${src}" alt="Foto a analizar" style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px;">
        <button class="remove-btn" onclick="removePhoto(event, 0)">✕</button>
    `;
    slot.classList.add('has-image');
    slot.onclick = null;
    updateUI();
}

// Eliminar la foto si el usuario se arrepiente
function removePhoto(event, index) {
    event.stopPropagation();
    currentPhoto = null;
    const slot = document.getElementById('slot0');
    slot.innerHTML = `
        <span class="slot-icon">📷</span>
        <button class="remove-btn" onclick="removePhoto(event, 0)" style="display:none;">✕</button>
    `;
    slot.classList.remove('has-image');
    slot.onclick = () => triggerSlot(0);
    updateUI();
}

// Habilitar el botón "Continuar" solo si hay foto
function updateUI() {
    const count = currentPhoto ? 1 : 0;
    document.getElementById('photoCount').textContent = count; 
    document.getElementById('btnContinuar').disabled = !currentPhoto;
}

// Drag & Drop (Arrastrar y soltar)
const uploadSection = document.getElementById('uploadSection');
if (uploadSection) {
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
        handleFiles(e.dataTransfer.files);
    });
}

// ==========================================
// 3. FUNCIÓN DE INTELIGENCIA ARTIFICIAL
// ==========================================
async function irAMapa() {
    if (!currentPhoto) return;

    // 1. Cambiar el texto del botón
    const btnContinuar = document.getElementById('btnContinuar');
    btnContinuar.disabled = true;
    btnContinuar.textContent = "Analizando imagen...";

    try {
        // 2. Cargar el modelo
        const model = await tf.loadGraphModel('../models/model.json');

        // 3. Crear imagen en memoria
        const imgElement = new Image();
        imgElement.src = currentPhoto;

        imgElement.onload = async () => {
            // 4. Preprocesamiento (¡Ajusta el 224x224 si tu modelo usa otro tamaño!)
            let tensor = tf.browser.fromPixels(imgElement)
                .resizeNearestNeighbor([224, 224]) 
                .toFloat();

            tensor = tensor.div(tf.scalar(255.0));
            tensor = tensor.expandDims(0);

            // 5. EJECUTAR LA PREDICCIÓN
            const prediction = model.predict(tensor);
            const resultados = await prediction.data(); // Ahora esto es un arreglo de 1 solo valor [0.xxx]
            const valorPrediccion = resultados[0]; 
            console.log("Valor crudo de la predicción:", valorPrediccion);

            // 6. ANALIZAR RESULTADO BINARIO (Sigmoid)
            // Asumiendo que 0 es Ajolote y 1 es otra cosa (ajusta según tus carpetas)
            let animalDetectado = "";
            let porcentajeConfianza = 0;

            if (valorPrediccion < 0.5) {
                animalDetectado = "Ajolote";
                // Si es 0.10, la confianza de que es Ajolote es 90% (1 - 0.10)
                porcentajeConfianza = ((1 - valorPrediccion) * 100).toFixed(2); 
            } else {
                animalDetectado = "No es un Ajolote";
                // Si es 0.85, la confianza de que NO es Ajolote es 85%
                porcentajeConfianza = (valorPrediccion * 100).toFixed(2);
            }

            console.log(`Detectado: ${animalDetectado} (${porcentajeConfianza}%)`);

            // 7. GUARDAR LOS DATOS PARA LA SIGUIENTE PÁGINA
            sessionStorage.setItem('fotoParaAnalizar', currentPhoto);
            sessionStorage.setItem('especieDetectada', animalDetectado);
            sessionStorage.setItem('confianza', porcentajeConfianza);

            // 8. Ir a la siguiente página
            window.location.href = 'Mapa.html';
        };

    } catch (error) {
        console.error("Error al ejecutar el modelo:", error);
        alert("Hubo un problema analizando la imagen. Revisa la consola.");
        btnContinuar.disabled = false;
        btnContinuar.textContent = "Continuar";
    }
}