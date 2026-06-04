const photos = [null, null, null];       
const fileObjects = [null, null, null]; // Guarda los binarios reales para Multer
let activeSlot = null;                  
const CLASES_ANIMALES = ["Ajolote"];    // El aporte de Ángel

// Al cargar la pantalla, verificamos si el usuario de verdad inició sesión
const usuarioString = localStorage.getItem('usuarioWildLens');
let idUsuarioLogeado = null;

if (usuarioString) {
    const usuarioLogueado = JSON.parse(usuarioString);
    idUsuarioLogeado = usuarioLogueado.id_usuario || usuarioLogueado.id;
}

if (!idUsuarioLogeado) {
    Swal.fire({
        title: 'Acceso Denegado',
        text: 'Para registrar un avistamiento, debes iniciar sesión.',
        icon: 'warning',
        confirmButtonColor: '#2B7055'
    }).then(() => {
        window.location.href = '../paginas/login.html'; 
    });
} else {
    // Si inició sesión correctamente, inyectamos dinámicamente su ID en el formulario
    document.getElementById('id-usuario').value = idUsuarioLogeado;
}
// EL CEREBRO DE LA IA (Integración de TensorFlow)
async function analizarFotoIA(base64Image) {
    try {
        // Carga del modelo (Asegúrate de que la ruta ../models/model.json exista en tu proyecto)
        const model = await tf.loadGraphModel('../models/model.json');
        
        const imgElement = new Image();
        imgElement.src = base64Image;

        return new Promise((resolve) => {
            imgElement.onload = async () => {
                // Preprocesamiento de la imagen a 224x224 para la Red Neuronal
                let tensor = tf.browser.fromPixels(imgElement)
                    .resizeNearestNeighbor([224, 224]) 
                    .toFloat();

                tensor = tensor.div(tf.scalar(255.0));
                tensor = tensor.expandDims(0);

                // Predicción
                const prediction = model.predict(tensor);
                const resultados = await prediction.data(); 
                resolve(resultados[0]); // Devuelve el valor numérico bruto
            };
        });
    } catch (error) {
        console.error("Error al cargar o ejecutar el modelo de IA:", error);
        return null; // Retorna null si la IA falla (para no bloquear la app)
    }
}

async function cambiarAlPaso(pasoDestino) {
    
    // --- BARRERA DE SEGURIDAD 
    if (pasoDestino === 2) {
        const fotosSubidas = photos.filter(p => p !== null);
        
        if (fotosSubidas.length === 0) {
            Swal.fire('Falta Evidencia', 'Por favor, añade al menos una fotografía de evidencia.', 'warning');
            return;
        }

        // 🧠 Inicia el análisis de la IA con la primera foto subida
        const btnContinuar = document.getElementById('btnContinuar');
        const textoOriginal = btnContinuar.innerText;
        btnContinuar.innerText = "Analizando con IA...";
        btnContinuar.disabled = true;

        const valorPrediccion = await analizarFotoIA(fotosSubidas[0]);

        if (valorPrediccion !== null) {
            let animalDetectado = "";
            let porcentajeConfianza = 0;

            // Función Sigmoide Binaria
            if (valorPrediccion < 0.5) {
                animalDetectado = "Ajolote";
                porcentajeConfianza = ((1 - valorPrediccion) * 100).toFixed(2);
            } else {
                animalDetectado = "No es un Ajolote";
                porcentajeConfianza = (valorPrediccion * 100).toFixed(2);
            }

            console.log(`📡 BioNode IA Detectó: ${animalDetectado} (${porcentajeConfianza}%)`);
            sessionStorage.setItem('especieDetectada', animalDetectado);
            sessionStorage.setItem('confianza', porcentajeConfianza);

            // Si la IA cree que no es un ajolote, lanzamos alerta preventiva
            if (animalDetectado !== "Ajolote") {
                const result = await Swal.fire({
                    title: 'Análisis IA Completado',
                    text: `Nuestra red neuronal estima con un ${porcentajeConfianza}% de seguridad que la imagen NO contiene un ajolote. ¿Deseas continuar con el registro de todos modos?`,
                    icon: 'question',
                    showCancelButton: true,
                    confirmButtonColor: '#2B7055',
                    cancelButtonColor: '#d33',
                    confirmButtonText: 'Sí, es un ajolote',
                    cancelButtonText: 'Revisar foto'
                });

                if (!result.isConfirmed) {
                    btnContinuar.innerText = textoOriginal;
                    btnContinuar.disabled = false;
                    return; // Abortamos el cambio de página
                }
            } else if (animalDetectado == "Ajolote"){
                const result = await Swal.fire({
                    title: 'Analisis de IA completo',
                    text: `Nuestra red neuronal estima con un ${porcentajeConfianza}% de seguridad que la imagen si es un Ajolote`,
                    icon:'question',
                    showCancelButton: true,
                    confirmButtonColor:' #2B7055',
                    confirmButtonText: 'Continuar',
                });
            }
        }
        
        // Restauramos el botón
        btnContinuar.innerText = textoOriginal;
        btnContinuar.disabled = false;
    }
    
    document.querySelectorAll('.seccion-paso').forEach(sec => sec.classList.remove('paso-activo'));
    document.getElementById('step1-indicator').classList.remove('active');
    document.getElementById('step2-indicator').classList.remove('active');
    document.getElementById('step3-indicator').classList.remove('active');
    
    const navbar = document.getElementById('mainNavbar');
    const stepperWrapper = document.getElementById('stepperWrapper');
    
    if (pasoDestino === 1) {
        document.getElementById('paso-1').classList.add('paso-activo');
        document.getElementById('step1-indicator').classList.add('active');
        navbar.style.display = "block";
        stepperWrapper.className = "page-wrapper"; 
    } else if (pasoDestino === 2) {
        document.getElementById('paso-2').classList.add('paso-activo');
        document.getElementById('step1-indicator').classList.add('active');
        document.getElementById('step2-indicator').classList.add('active');
        navbar.style.display = "none"; 
        stepperWrapper.className = "map-mode-stepper";
        setTimeout(() => map.invalidateSize(), 100); 
    } else if (pasoDestino === 3) {
        document.getElementById('paso-3').classList.add('paso-activo');
        document.getElementById('step1-indicator').classList.add('active');
        document.getElementById('step2-indicator').classList.add('active');
        document.getElementById('step3-indicator').classList.add('active');
        navbar.style.display = "block";
        stepperWrapper.className = "page-wrapper";
        
        // Dispara la consulta a iNaturalist con el valor seleccionado por defecto
        cargarInfoiNaturalist(document.getElementById('id-especie').value);
    }
}

// LÓGICA DE FOTOS MULTIPLES
function triggerSlot(index) {
    const slot = document.getElementById('slot' + index);
    if (slot.classList.contains('has-image')) return; 
    activeSlot = index;
    document.getElementById('fileInput').click();
}

function handleFiles(files) {
    const fileArray = Array.from(files);
    let processed = 0;
    const progressWrap = document.getElementById('progressWrap');
    const progressFill = document.getElementById('progressFill');
    if(progressWrap) progressWrap.classList.add('visible');
    if(progressFill) progressFill.style.width = '0%';

    let slotIndex = activeSlot;

    fileArray.forEach((file) => {
        if (!file.type.startsWith('image/')) return;
        if (slotIndex === null || photos[slotIndex] !== null) {
            slotIndex = photos.indexOf(null);
            if (slotIndex === -1) { 
                Swal.fire('Espacio Lleno', 'Ya tienes 3 fotos. Elimina una para agregar otra.', 'info');
                return;
            }
        }
        const targetSlot = slotIndex;
        slotIndex = null; 

        fileObjects[targetSlot] = file; 

        const reader = new FileReader();
        reader.onload = function(e) {
            photos[targetSlot] = e.target.result;
            renderSlot(targetSlot, e.target.result);
            processed++;
            if(progressFill) progressFill.style.width = (processed / fileArray.length * 100) + '%';
            if (processed === fileArray.length) {
                setTimeout(() => {
                    if(progressWrap) progressWrap.classList.remove('visible');
                    if(progressFill) progressFill.style.width = '0%';
                }, 600);
            }
            updateUI();
        };
        reader.readAsDataURL(file);
    });
    document.getElementById('fileInput').value = '';
    activeSlot = null;
}

function renderSlot(index, src) {
    const slot = document.getElementById('slot' + index);
    slot.innerHTML = `<img src="${src}"><button type="button" class="remove-btn" onclick="removePhoto(event, ${index})">✕</button>`;
    slot.classList.add('has-image');
    slot.onclick = null;
}

function removePhoto(event, index) {
    event.stopPropagation();
    photos[index] = null;
    fileObjects[index] = null; 
    const slot = document.getElementById('slot' + index);
    slot.innerHTML = `<span class="slot-icon">📷</span><button type="button" class="remove-btn" onclick="removePhoto(event, ${index})">✕</button>`;
    slot.classList.remove('has-image');
    slot.onclick = () => triggerSlot(index);
    updateUI();
}

function updateUI() {
    const count = photos.filter(p => p !== null).length;
    document.getElementById('photoCount').textContent = count;
    document.getElementById('btnContinuar').disabled = (count === 0);
}

// Drag & Drop (El aporte de Ángel adaptado)
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

const limitesMexico = [[19.152970, -99.156045], [19.318469, -99.006223]];

const map = L.map('map', { 
    doubleClickZoom: false, attributionControl: false, zoomControl: false,       
    maxBounds: limitesMexico, maxBoundsViscosity: 1.0, minZoom: 9               
}).setView([19.152501, -99.006223], 10);

const mapaBasico = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', { maxZoom: 20 });
const mapaSatelite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19 });

const mapaGuardado = localStorage.getItem('wildlens_mapa_preferido');
if (mapaGuardado === 'satelite') {
    mapaSatelite.addTo(map);
    document.getElementById('btn-satelite').classList.add('active');
    document.getElementById('btn-basico').classList.remove('active');
} else { mapaBasico.addTo(map); }

function cambiarMapa(tipo) {
    map.removeLayer(mapaBasico); map.removeLayer(mapaSatelite);
    document.getElementById('btn-basico').classList.remove('active');
    document.getElementById('btn-satelite').classList.remove('active');

    if (tipo === 'basico') { mapaBasico.addTo(map); document.getElementById('btn-basico').classList.add('active'); } 
    else if (tipo === 'satelite') { mapaSatelite.addTo(map); document.getElementById('btn-satelite').classList.add('active'); }
    localStorage.setItem('wildlens_mapa_preferido', tipo);
    document.getElementById('menu-mapas').classList.remove('mostrar');
}

const iconoPersonalizado = L.icon({
    iconUrl: '../images/sub_icon.png', iconSize: [50, 55], iconAnchor: [22, 45], popupAnchor: [0, -45] 
});

const marker = L.marker([19.4326, -99.1332], { draggable: true, icon: iconoPersonalizado }).addTo(map);

document.getElementById('latitud').value = 19.4326;
document.getElementById('longitud').value = -99.1332;

const coordsDisplay = document.getElementById('coords-display');

marker.on('dragend', function() {
    const position = marker.getLatLng();
    document.getElementById('latitud').value = position.lat;
    document.getElementById('longitud').value = position.lng;
    actualizarTarjeta(position.lat, position.lng);
});

const iconoUbicacionActual = L.divIcon({
    className: 'custom-div-icon',
    html: `<div class="custom-pin-container"><div class="wildlens-pulse"></div><div class="wildlens-pin"></div></div>`,
    iconSize: [30, 30], iconAnchor: [15, 15]
});

let marcadorUbicacion = null, circuloPrecision = null;  

function centrarEnMiUbicacion() { map.locate({setView: true, maxZoom: 16}); }

map.on('locationfound', function(e) {
    if (marcadorUbicacion) map.removeLayer(marcadorUbicacion);
    if (circuloPrecision) map.removeLayer(circuloPrecision);
    
    marcadorUbicacion = L.marker(e.latlng, { icon: iconoUbicacionActual }).addTo(map);
    circuloPrecision = L.circle(e.latlng, { color: '#2B7055', fillColor: '#2B7055', fillOpacity: 0.15, weight: 1 }).addTo(map);

    marker.setLatLng(e.latlng);
    document.getElementById('latitud').value = e.latlng.lat;
    document.getElementById('longitud').value = e.latlng.lng;
    actualizarTarjeta(e.latlng.lat, e.latlng.lng);
});

const infoCard = document.querySelector('.info-card');
map.on('movestart', function() { if (infoCard) infoCard.classList.add('oculta'); });
map.on('moveend', function() { if (infoCard) infoCard.classList.remove('oculta'); });

map.on('dblclick', function(event) {
    marker.setLatLng(event.latlng); map.flyTo(event.latlng, map.getZoom());
    document.getElementById('latitud').value = event.latlng.lat;
    document.getElementById('longitud').value = event.latlng.lng;
    actualizarTarjeta(event.latlng.lat, event.latlng.lng);
});

// Buscador Photon
const inputBusqueda = document.getElementById('input-busqueda');
const listaResultados = document.getElementById('lista-resultados');
let temporizadorBusqueda;

if (inputBusqueda) {
    inputBusqueda.addEventListener('input', function() {
        clearTimeout(temporizadorBusqueda); 
        const query = this.value;
        if (query.length < 3) { cerrarBuscador(); return; }

        temporizadorBusqueda = setTimeout(async () => {
            try {
                const url = `https://photon.komoot.io/api/?q=${query}&lat=19.40&lon=-99.02&limit=5`;
                const respuesta = await fetch(url);
                const datos = await respuesta.json();
                listaResultados.innerHTML = ''; 

                if (datos.features.length > 0) {
                    listaResultados.classList.remove('oculto');
                    datos.features.forEach(lugar => {
                        const props = lugar.properties;
                        const nombreLugar = props.name || props.street;
                        if (!nombreLugar) return; 

                        const li = document.createElement('li');
                        li.innerHTML = nombreLugar.replace(new RegExp(`(${query})`, "gi"), "<strong>$1</strong>");
                        
                        li.onclick = () => {
                            const lng = lugar.geometry.coordinates[0]; const lat = lugar.geometry.coordinates[1];
                            map.flyTo([lat, lng], 16); marker.setLatLng([lat, lng]);
                            document.getElementById('latitud').value = lat; document.getElementById('longitud').value = lng;
                            inputBusqueda.value = nombreLugar; cerrarBuscador();
                        };
                        listaResultados.appendChild(li);
                    });
                } else { cerrarBuscador(); }
            } catch (error) {}
        }, 300); 
    });
}

function cerrarBuscador() { if (listaResultados) { listaResultados.classList.add('oculto'); listaResultados.innerHTML = ''; } }
map.on('click', cerrarBuscador); map.on('dragstart', cerrarBuscador);
function toggleMenuMapas() { document.getElementById('menu-mapas').classList.toggle('mostrar'); }

async function obtenerDireccion(lat, lng) {
    try {
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;
        const res = await fetch(url);
        const datos = await res.json();
        if (datos && datos.address) {
            return datos.address.road || datos.address.city || "Área natural";
        }
    } catch (e) { return "Ubicación sin registrar"; }
}

async function actualizarTarjeta(lat, lng) {
    if (coordsDisplay) {
        coordsDisplay.innerHTML = `📍 Buscando ubicación...`;
        const dir = await obtenerDireccion(lat, lng);
        coordsDisplay.innerHTML = `📍 <strong>${dir}</strong><br><span style="font-size: 11px;">Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)}</span>`;
    }
}

// POST FINAL A NODE.JS CON FORMDATA
document.getElementById('formulario-registro-maestro').addEventListener('submit', async function(evento) {
    evento.preventDefault(); 
    const btn = document.getElementById('btnFinalizar');
    btn.innerText = "Sincronizando con BioNode..."; btn.disabled = true;

    const fotoParaSubir = fileObjects.find(f => f !== null);
    
    if (!fotoParaSubir) {
        Swal.fire('Error', 'Ocurrió un error leyendo el archivo. Regresa al paso 1.', 'error');
        btn.innerText = "Finalizar y Guardar Registro"; btn.disabled = false; return;
    }

    const empaqueDatos = new FormData();
    empaqueDatos.append('foto', fotoParaSubir); 
    empaqueDatos.append('id_usuario', document.getElementById('id-usuario').value);
    empaqueDatos.append('id_especie', document.getElementById('id-especie').value);
    empaqueDatos.append('latitud', document.getElementById('latitud').value);
    empaqueDatos.append('longitud', document.getElementById('longitud').value);
    empaqueDatos.append('descripcion', document.getElementById('informe-notas').value);
    empaqueDatos.append('fecha_avistamiento', new Date().toISOString().slice(0, 19).replace('T', ' '));

    try {
        const respuesta = await fetch('http://127.0.0.1:3000/api/guardar-observacion', {
            method: 'POST',
            body: empaqueDatos 
        });

        const resultado = await respuesta.json();
        if (respuesta.ok) {
            Swal.fire({
                title: '¡Registro Exitoso!',
                text: 'Tu avistamiento se ha guardado en la red WildLens. 🌿',
                icon: 'success',
                confirmButtonColor: '#2B7055'
            }).then(() => {
                window.location.href = '../Index.html'; 
            });
        } else {
            Swal.fire('Error al guardar', resultado.error || 'Problema de BD', 'error');
        }
    } catch (error) {
        Swal.fire('Error de Conexión', 'No se pudo conectar con Node.js. ¿Está encendido tu servidor?', 'error');
    } finally {
        btn.innerText = "Finalizar y Guardar Registro"; btn.disabled = false;
    }
});

// INTEGRACIÓN CON INATURALIST API

// Diccionario que vincula tus IDs con los Taxon IDs de iNaturalist
const INAT_TAXONS = {
    "1": 26777, // Ambystoma mexicanum
    "2": 26778, // Ambystoma dumerilii
    "3": 26788, // Ambystoma taylori
    "4": 26774  // Ambystoma andersoni
};

async function cargarInfoiNaturalist(idLocal) {
    const contenedor = document.getElementById('inaturalist-widget');
    contenedor.style.display = 'block';
    
    // Mostramos un mensaje de carga con el color de WildLens
    contenedor.innerHTML = `<div style="text-align: center; padding: 15px; color: #2B7055;">
                                🌿 Consultando la red global de iNaturalist...
                            </div>`;

    const taxonId = INAT_TAXONS[idLocal] || 26777; // Por defecto busca el A. mexicanum

    try {
        // Hacemos la petición a la API pública de iNaturalist
        const respuesta = await fetch(`https://api.inaturalist.org/v1/taxa/${taxonId}`);
        const datos = await respuesta.json();

        if (datos.results && datos.results.length > 0) {
            const especie = datos.results[0];
            
            // Extraemos los datos que nos importan
            const nombreComun = especie.preferred_common_name || especie.name;
            const nombreCientifico = especie.name;
            const totalObservaciones = especie.observations_count;
            const fotoUrl = especie.default_photo ? especie.default_photo.medium_url : '../images/placeholder.png';
            
            let estadoConservacion = "Críticamente Amenazado"; // Valor real por defecto para A. mexicanum

            // Buscamos la propiedad correcta dependiendo de cómo responda la API
            if (especie.conservation_statuses && especie.conservation_statuses.length > 0) {
                let statusIngles = especie.conservation_statuses[0].status_name || especie.conservation_statuses[0].status;
                if (statusIngles) estadoConservacion = statusIngles;
            } else if (especie.conservation_status) {
                let statusIngles = especie.conservation_status.status_name || especie.conservation_status.status;
                if (statusIngles) estadoConservacion = statusIngles;
            }

            // Traducción y formato visual para WildLens
            if (estadoConservacion.toLowerCase() === "critically endangered" || estadoConservacion === "cr") {
                estadoConservacion = "Críticamente Amenazado";
            } else if (estadoConservacion.toLowerCase() === "endangered" || estadoConservacion === "en") {
                estadoConservacion = "En Peligro";
            } else if (estadoConservacion.toLowerCase() === "vulnerable" || estadoConservacion === "vu") {
                estadoConservacion = "Vulnerable";
            }
            // Pintamos la tarjeta en el HTML
            contenedor.innerHTML = `
                <div style="display: flex; gap: 15px; align-items: center; background: #f4f9f7; padding: 15px; border-radius: 12px; border-left: 5px solid #2B7055; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                    <img src="${fotoUrl}" alt="${nombreComun}" style="width: 90px; height: 90px; object-fit: cover; border-radius: 8px;">
                    <div>
                        <h4 style="margin: 0 0 5px 0; color: #2B7055; font-family: 'Montserrat', sans-serif; font-size: 16px;">${nombreComun}</h4>
                        <p style="margin: 0 0 5px 0; font-style: italic; color: #666; font-size: 13px;">${nombreCientifico}</p>
                        <p style="margin: 0 0 5px 0; color: #333; font-size: 13px;">
                            <strong>Observaciones globales:</strong> ${totalObservaciones.toLocaleString()}<br>
                            <strong>Estado:</strong> <span style="color: #d9534f; font-weight: 600;">${estadoConservacion}</span>
                        </p>
                        <a href="https://www.inaturalist.org/taxa/${taxonId}" target="_blank" style="font-size: 12px; color: #2B7055; text-decoration: none; font-weight: 600;">
                            Ver más detalles en iNaturalist ↗
                        </a>
                    </div>
                </div>
            `;
        }
    } catch (error) {
        contenedor.innerHTML = `<div style="color: #d9534f; padding: 10px; border: 1px solid #d9534f; border-radius: 8px;">Error al conectar con iNaturalist.</div>`;
        console.error("Error obteniendo datos de iNaturalist:", error);
    }
}

// 1. Escuchar cuando el usuario cambie la especie en el menú desplegable
document.getElementById('id-especie').addEventListener('change', function(e) {
    cargarInfoiNaturalist(e.target.value);
});