// ==========================================
// 1. ESTADO GLOBAL (Aquí viven las fotos)
// ==========================================
const photos = [null, null, null];       
const fileObjects = [null, null, null]; // Guarda los binarios reales para Multer
let activeSlot = null;                   

// ==========================================
// 2. CONTROLADOR DE VISTAS (El SPA)
// ==========================================
function cambiarAlPaso(pasoDestino) {
    if (pasoDestino === 2) {
        if (photos.filter(p => p !== null).length === 0) {
            alert("Por favor, añade al menos una fotografía de evidencia.");
            return;
        }
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
        navbar.style.display = "none"; // Ocultamos barra superior para ver el mapa completo
        stepperWrapper.className = "map-mode-stepper";
        setTimeout(() => map.invalidateSize(), 100); // Leaflet necesita esto al mostrar un div oculto
    } else if (pasoDestino === 3) {
        document.getElementById('paso-3').classList.add('paso-activo');
        document.getElementById('step1-indicator').classList.add('active');
        document.getElementById('step2-indicator').classList.add('active');
        document.getElementById('step3-indicator').classList.add('active');
        navbar.style.display = "block";
        stepperWrapper.className = "page-wrapper";
    }
}

// ==========================================
// 3. LÓGICA DE FOTOS (Tu código intacto)
// ==========================================
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

        fileObjects[targetSlot] = file; // <-- El archivo crudo listo para Node.js

        const reader = new FileReader();
        reader.onload = function(e) {
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

// ==========================================
// 4. EL MAPA LEAFLET (Tu código intacto)
// ==========================================
const limitesMexico = [[14.5321, -118.3985], [32.7187, -86.7104]];

const map = L.map('map', { 
    doubleClickZoom: false, attributionControl: false, zoomControl: false,       
    maxBounds: limitesMexico, maxBoundsViscosity: 1.0, minZoom: 5                
}).setView([19.4326, -99.1332], 14);

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

// Insertamos la posición inicial al estado oculto
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

// ==========================================
// 5. POST FINAL A NODE.JS CON FORMDATA
// ==========================================
document.getElementById('formulario-registro-maestro').addEventListener('submit', async function(evento) {
    evento.preventDefault(); 
    const btn = document.getElementById('btnFinalizar');
    btn.innerText = "Enviando reporte..."; btn.disabled = true;

    // Buscamos el primer archivo real que se haya cargado
    const fotoParaSubir = fileObjects.find(f => f !== null);
    
    if (!fotoParaSubir) {
        alert("Ocurrió un error leyendo el archivo. Por favor, regresa al paso 1 y vuelve a seleccionar la foto.");
        btn.innerText = "Finalizar y Guardar Registro"; btn.disabled = false; return;
    }

    const empaqueDatos = new FormData();
    empaqueDatos.append('foto', fotoParaSubir); // Multer capturará 'foto'
    
    // Adjuntamos el resto del formulario
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
            alert('¡Ajolote registrado con éxito! 🌿');
            window.location.href = '../Index.html'; // Lo mandamos de regreso al inicio
        } else {
            alert('Error al guardar: ' + (resultado.error || 'Problema de BD'));
        }
    } catch (error) {
        alert('No se pudo conectar con Node.js. ¿Está encendido tu servidor?');
    } finally {
        btn.innerText = "Finalizar y Guardar Registro"; btn.disabled = false;
    }
});