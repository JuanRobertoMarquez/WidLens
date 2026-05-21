// Importamos las librerías
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const multer = require('multer'); // 1. Importamos multer
const path = require('path');     // 2. Importamos path (ya viene con Node, no hay que instalarlo)

// Inicializamos la aplicación
const app = express();
app.use(cors()); // Permite conexiones desde tu frontend
app.use(express.json()); // Permite que el servidor entienda datos en formato JSON

// 3. HACER LA CARPETA PÚBLICA 
// Esto permite que el navegador pueda ver las fotos entrando a http://localhost:3000/uploads/foto.jpg
app.use('/subidas', express.static(path.join(__dirname, 'subidas')));

// 4. CONFIGURAR LA BODEGA (MULTER)
const almacenamiento = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'subidas/'); // Le decimos que guarde todo en la carpeta uploads
    },
    filename: function (req, file, cb) {
        // Le ponemos un nombre único: la fecha en milisegundos + el nombre original
        // Ejemplo: 1716263445123-ajolote_xochi.jpg
        const nombreUnico = Date.now() + '-' + file.originalname;
        cb(null, nombreUnico);
    }
});

// Creamos el "portero" que revisará las subidas
const upload = multer({ storage: almacenamiento });

// --- CONFIGURACIÓN DE LA BASE DE DATOS ---
const db = mysql.createConnection({
    host: 'localhost',      // Usualmente localhost si trabajas en tu compu
    user: 'root',           // Tu usuario de MySQL (por defecto es root)
    password: '2023630816',           // Tu contraseña (déjalo vacío si usas XAMPP por defecto)
    database: 'WildLens' // El nombre de la base de datos que vayas a crear
});

db.connect((error) => {
    if (error) {
        console.error('❌ Error conectando a la base de datos:', error.message);
        return;
    }
    console.log('✅ Conectado exitosamente a la base de datos MySQL');
});

app.get('/api/estado', (req, res) => {
    res.json({ mensaje: '¡El servidor de WildLens está funcionando al 100%!' });
});

// Ruta para obtener la última observación registrada
// Ruta para obtener la última observación registrada con su imagen
app.get('/api/observacion-reciente', (req, res) => {
    const sql = `
        SELECT 
            u.nombre AS nombre_usuario,
            e.nombre_comun AS especie_nombre,
            o.foto AS observacion_foto,
            o.fecha_avistamiento,
            o.latitud,
            o.longitud
        FROM Observaciones o
        JOIN Usuarios u ON o.id_usuario = u.id_usuario
        JOIN Especies e ON o.id_especie = e.id_especie
        ORDER BY o.fecha_avistamiento DESC
        LIMIT 1;
    `;

    // Ruta para obtener las observaciones del carrusel
app.get('/api/carrusel-observaciones', (req, res) => {
    const sql = `
        SELECT 
            e.nombre_comun AS especie_nombre,
            o.foto AS observacion_foto,
            o.estatus_validacion
        FROM Observaciones o
        JOIN Especies e ON o.id_especie = e.id_especie
        ORDER BY o.fecha_avistamiento DESC
        LIMIT 6; -- Traemos los 6 más recientes
    `;

    db.query(sql, (err, result) => {
        if (err) {
            console.error("Error al consultar carrusel:", err);
            return res.status(500).json({ error: "Error en la base de datos" });
        }
        res.json(result); 
    });
});

// Ruta para el Mapa de Exploración (Trae TODOS los registros)
app.get('/api/explorar-avistamientos', (req, res) => {
    const sql = `
        SELECT 
            o.id_observacion,
            o.latitud,
            o.longitud,
            o.foto AS observacion_foto,
            o.fecha_avistamiento,
            e.nombre_comun AS especie_nombre,
            u.nombre AS nombre_usuario
        FROM Observaciones o
        JOIN Especies e ON o.id_especie = e.id_especie
        JOIN Usuarios u ON o.id_usuario = u.id_usuario
        ORDER BY o.fecha_avistamiento DESC;
    `;

    db.query(sql, (err, result) => {
        if (err) {
            console.error("Error al consultar el mapa:", err);
            return res.status(500).json({ error: "Error en la base de datos" });
        }
        res.json(result); 
    });
});

    db.query(sql, (err, result) => {
        if (err) {
            console.error("Error al consultar:", err);
            return res.status(500).json({ error: "Error en la base de datos" });
        }
        
        if (result.length > 0) {
            // Le mandamos el primer resultado (el más reciente)
            res.json(result[0]); 
        } else {
            res.status(404).json({ mensaje: "Aún no hay observaciones" });
        }
    });
});


// Ruta POST para recibir una nueva observación
// El middleware "upload.single('foto')" le dice a multer que atrape el archivo que venga con el nombre 'foto'
app.post('/api/guardar-observacion', upload.single('foto'), (req, res) => {
    
    // 1. Agarramos los textos que manda el formulario
    const { id_usuario, id_especie, latitud, longitud, fecha_avistamiento } = req.body;
    
    // 2. Agarramos el nombre de la foto que Multer acaba de guardar
    // req.file contiene la info del archivo. Guardamos la ruta que leerá el frontend.
    const rutaFoto = req.file ? '/uploads/' + req.file.filename : null;

    if (!rutaFoto) {
        return res.status(400).json({ error: "No se subió ninguna foto" });
    }

    // 3. Preparamos la orden SQL (Fíjate que guardamos 'rutaFoto', no el archivo)
    const sql = `
        INSERT INTO Observaciones 
        (id_usuario, id_especie, foto, latitud, longitud, fecha_avistamiento) 
        VALUES (?, ?, ?, ?, ?, ?)
    `;

    // 4. Ejecutamos la inserción en la BD
    db.query(sql, [id_usuario, id_especie, rutaFoto, latitud, longitud, fecha_avistamiento], (err, result) => {
        if (err) {
            console.error("Error al guardar en la BD:", err);
            return res.status(500).json({ error: "Error interno del servidor" });
        }
        
        res.status(200).json({ 
            mensaje: "¡Observación y foto guardadas con éxito!",
            ruta_imagen: rutaFoto // Se la regresamos al frontend por si la quiere mostrar enseguida
        });
    });
});

// Ruta para el Mapa de Exploración (Trae TODOS los registros)
app.get('/api/explorar-avistamientos', (req, res) => {
    const sql = `
        SELECT 
            o.id_observacion,
            o.latitud,
            o.longitud,
            o.foto AS observacion_foto,
            o.fecha_avistamiento,
            e.nombre_comun AS especie_nombre,
            u.nombre AS nombre_usuario
        FROM Observaciones o
        JOIN Especies e ON o.id_especie = e.id_especie
        JOIN Usuarios u ON o.id_usuario = u.id_usuario
        ORDER BY o.fecha_avistamiento DESC;
    `;

    db.query(sql, (err, result) => {
        if (err) {
            console.error("Error al consultar el mapa:", err);
            return res.status(500).json({ error: "Error en la base de datos" });
        }
        res.json(result); 
    });
});
// --- ARRANCAR EL SERVIDOR ---
const PUERTO = 3000;
app.listen(PUERTO, () => {
    console.log(`🚀 Servidor corriendo en el puerto ${PUERTO}`);
});