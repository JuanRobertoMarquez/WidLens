
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors()); 
app.use(express.json()); 

// Hacer pública TODA la carpeta 'subidas' para que lea avistamientos y perfiles
app.use('/subidas', express.static(path.join(__dirname, 'subidas')));

// ==========================================
// 2. CONFIGURACIÓN DE LAS BODEGAS (MULTER)
// ==========================================

// Bodega A: Para las fotos de los Ajolotes
const storageAvistamientos = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'subidas/avistamientos/'); 
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const uploadAvistamientos = multer({ storage: storageAvistamientos });

// Bodega B: Para las fotos de Perfil de los Usuarios
const storagePerfiles = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'subidas/Perfiles/'); 
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const uploadPerfiles = multer({ storage: storagePerfiles });

// ==========================================
// 3. CONEXIÓN A LA BASE DE DATOS
// ==========================================
const db = mysql.createConnection({
    host: 'localhost',      
    user: 'root',           
    password: '2023630816',           
    database: 'WildLens' 
});

db.connect((error) => {
    if (error) {
        console.error('❌ Error conectando a la base de datos:', error.message);
        return;
    }
    console.log('✅ Conectado exitosamente a la base de datos MySQL');
});

// ==========================================
// 4. RUTAS DE LA APLICACIÓN (ENDPOINTS)
// ==========================================

// --- RUTA DE PRUEBA ---
app.get('/api/estado', (req, res) => {
    res.json({ mensaje: '¡El servidor de WildLens está funcionando al 100%!' });
});

// --- RUTA: HISTORIA RECIENTE (Muro principal) ---
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
    db.query(sql, (err, result) => {
        if (err) return res.status(500).json({ error: "Error en la base de datos" });
        if (result.length > 0) {
            res.json(result[0]); 
        } else {
            res.status(404).json({ mensaje: "Aún no hay observaciones" });
        }
    });
});

// --- RUTA: CARRUSEL DINÁMICO ---
app.get('/api/carrusel-observaciones', (req, res) => {
    const sql = `
        SELECT 
            e.nombre_comun AS especie_nombre,
            o.foto AS observacion_foto,
            o.estatus_validacion
        FROM Observaciones o
        JOIN Especies e ON o.id_especie = e.id_especie
        ORDER BY o.fecha_avistamiento DESC
        LIMIT 6;
    `;
    db.query(sql, (err, result) => {
        if (err) return res.status(500).json({ error: "Error en la base de datos" });
        res.json(result); 
    });
});

// --- RUTA: MAPA EXPLORADOR (Todos los avistamientos) ---
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
        if (err) return res.status(500).json({ error: "Error en la base de datos" });
        res.json(result); 
    });
});

// --- RUTA: GUARDAR NUEVA OBSERVACIÓN (Usa uploadAvistamientos) ---
app.post('/api/guardar-observacion', uploadAvistamientos.single('foto'), (req, res) => {
    const { id_usuario, id_especie, latitud, longitud, fecha_avistamiento } = req.body;
    
    // Guardamos la ruta apuntando a la carpeta correcta
    const rutaFoto = req.file ? '/subidas/avistamientos/' + req.file.filename : null;

    if (!rutaFoto) {
        return res.status(400).json({ error: "No se subió ninguna foto" });
    }

    const sql = "INSERT INTO Observaciones (id_usuario, id_especie, foto, latitud, longitud, fecha_avistamiento) VALUES (?, ?, ?, ?, ?, ?)";
    db.query(sql, [id_usuario, id_especie, rutaFoto, latitud, longitud, fecha_avistamiento], (err, result) => {
        if (err) {
            console.error("Error al guardar en la BD:", err);
            return res.status(500).json({ error: "Error interno del servidor" });
        }
        res.status(200).json({ 
            mensaje: "¡Observación y foto guardadas con éxito!",
            ruta_imagen: rutaFoto 
        });
    });
});

// --- RUTA: REGISTRO DE USUARIO ---
app.post('/api/registro', (req, res) => {
    const { nombre, apellido, correo, contrasenia } = req.body;

    const verificarSql = "SELECT * FROM Usuarios WHERE correo = ?";
    db.query(verificarSql, [correo], (err, filas) => {
        if (err) return res.status(500).json({ error: "Error interno del servidor" });
        if (filas.length > 0) return res.status(400).json({ error: "El correo electrónico ya se encuentra registrado." });

        const insertarSql = "INSERT INTO Usuarios (nombre, apellido, correo, contrasenia) VALUES (?, ?, ?, ?)";
        db.query(insertarSql, [nombre, apellido, correo, contrasenia], (err, resultado) => {
            if (err) return res.status(500).json({ error: "No se pudo crear la cuenta en la base de datos." });
            res.status(201).json({ mensaje: "¡Cuenta creada exitosamente!" });
        });
    });
});

// --- RUTA: LOGIN ---
app.post('/api/login', (req, res) => {
    const { correo, contrasenia } = req.body;

    const sql = "SELECT id_usuario, nombre, apellido FROM Usuarios WHERE correo = ? AND contrasenia = ?";
    db.query(sql, [correo, contrasenia], (err, resultados) => {
        if (err) return res.status(500).json({ error: "Error interno del servidor" });

        if (resultados.length > 0) {
            res.status(200).json({
                mensaje: "Autenticación correcta",
                usuario: resultados[0]
            });
        } else {
            res.status(401).json({ error: "El correo o la contraseña son incorrectos." });
        }
    });
});

// --- RUTA: OBTENER PERFIL DE USUARIO ---
app.get('/api/perfil/:id', (req, res) => {
    const idUsuario = req.params.id;

    // Ya incluye el avatar en el SELECT
    const sqlUsuario = "SELECT nombre, apellido, correo, avatar FROM Usuarios WHERE id_usuario = ?";
    db.query(sqlUsuario, [idUsuario], (err, resUsuario) => {
        if (err) return res.status(500).json({ error: "Error al buscar usuario" });
        if (resUsuario.length === 0) return res.status(404).json({ error: "Usuario no encontrado" });

        const usuario = resUsuario[0];

        const sqlObservaciones = `
            SELECT o.foto, o.fecha_avistamiento, o.estatus_validacion, e.nombre_comun 
            FROM Observaciones o
            JOIN Especies e ON o.id_especie = e.id_especie
            WHERE o.id_usuario = ?
            ORDER BY o.fecha_avistamiento DESC
        `;
        db.query(sqlObservaciones, [idUsuario], (err, resObservaciones) => {
            if (err) return res.status(500).json({ error: "Error al buscar observaciones" });

            res.json({
                datosPersonales: usuario,
                totalObservaciones: resObservaciones.length,
                historial: resObservaciones
            });
        });
    });
});

// --- RUTA: EDITAR PERFIL (Usa uploadPerfiles) ---
app.put('/api/editar-perfil/:id', uploadPerfiles.single('avatar'), (req, res) => {
    const idUsuario = req.params.id;
    const { nombre, apellido, correo } = req.body;
    
    // Guardamos la ruta apuntando a la carpeta de Perfiles
    const rutaAvatar = req.file ? '/subidas/Perfiles/' + req.file.filename : null;

    let sql;
    let valores;

    if (rutaAvatar) {
        sql = "UPDATE Usuarios SET nombre = ?, apellido = ?, correo = ?, avatar = ? WHERE id_usuario = ?";
        valores = [nombre, apellido, correo, rutaAvatar, idUsuario];
    } else {
        sql = "UPDATE Usuarios SET nombre = ?, apellido = ?, correo = ? WHERE id_usuario = ?";
        valores = [nombre, apellido, correo, idUsuario];
    }

    db.query(sql, valores, (err, resultado) => {
        if (err) return res.status(500).json({ error: "Error en la base de datos" });
        res.status(200).json({ mensaje: "Perfil actualizado con éxito", nuevoAvatar: rutaAvatar });
    });
});

// ==========================================
// 5. ARRANCAR EL SERVIDOR
// ==========================================
const PUERTO = 3000;
app.listen(PUERTO, () => {
    console.log(`🚀 Servidor corriendo en el puerto ${PUERTO}`);
});