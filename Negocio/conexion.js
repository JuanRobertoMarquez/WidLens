const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs'); // Herramienta nativa para borrar archivos físicos

const app = express();
app.use(cors()); 
app.use(express.json()); 

//Conexion a ala base de datos
const db = mysql.createConnection({
    host: 'gateway01.us-east-1.prod.aws.tidbcloud.com',      
    port: 4000, 
    user: '266QR9U7MSUDEEJ.root',           
    password: 'KsDl3PVbbYLtbvVJ', // Reemplaza esto con tu contraseña          
    database: 'WildLens',
    // --- ESTE ES EL BLOQUE QUE EXIGE LA NUBE ---
    ssl: {
        minVersion: 'TLSv1.2',
        rejectUnauthorized: true 
    }
});

// Hacer pública TODA la carpeta 'subidas' para que lea avistamientos y perfiles
app.use('/Datos', express.static(path.join(__dirname, '../Datos')));

// Bodega A: Para las fotos de los Ajolotes
const storageAvistamientos = multer.diskStorage({
    destination: function (req, file, cb) {
        // Subimos un nivel (saliendo de Negocio) y entramos a Datos/subidas/avistamientos/
        cb(null, path.join(__dirname, '../Datos/subidas/avistamientos/')); 
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const uploadAvistamientos = multer({ storage: storageAvistamientos });

// Bodega B: Para las fotos de Perfil de los Usuarios
const storagePerfiles = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, '../Datos/subidas/Perfiles/')); 
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const uploadPerfiles = multer({ storage: storagePerfiles });

db.connect((error) => {
    if (error) {
        console.error('❌ Error conectando a la base de datos:', error.message);
        return;
    }
    console.log('✅ Conectado exitosamente a la base de datos MySQL');
});

// RUTAS DEL API (ENDPOINTS)
app.get('/api/estado', (req, res) => {
    res.json({ mensaje: '¡El servidor de WildLens está funcionando al 100%!' });
});

// --- RUTA: HISTORIA RECIENTE (Muro principal) ---
app.get('/api/observacion-reciente', (req, res) => {
    const sql = `
        SELECT 
            u.nombre AS nombre_usuario,
            e.nombre_comun AS especie_nombre,
            u.avatar AS usuario_avatar,
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

// --- RUTA: CARRUSEL DINÁMICO
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

// --- RUTA: MAPA EXPLORADOR ---
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

// --- RUTA: ESTADÍSTICAS GLOBALES (Franja Verde) 
app.get('/api/estadisticas', (req, res) => {
    const sql = `
        SELECT 
            (SELECT COUNT(*) FROM Observaciones) AS total_observaciones,
            (SELECT COUNT(DISTINCT id_especie) FROM Observaciones) AS especies_identificadas,
            (SELECT COUNT(*) FROM Usuarios) AS guardianes_activos
    `;
    db.query(sql, (err, resultados) => {
        if (err) {
            console.error("Error al obtener estadísticas:", err);
            return res.status(500).json({ error: "Error interno en la base de datos" });
        }
        res.json(resultados[0]); 
    });
});

// --- RUTA: TOP GUARDIANES (Leaderboard) ---
app.get('/api/top-guardianes', (req, res) => {
    const sql = `
        SELECT 
            u.id_usuario,
            u.nombre,
            u.apellido,
            u.avatar,
            COUNT(o.id_observacion) AS total_observaciones
        FROM Usuarios u
        JOIN Observaciones o ON u.id_usuario = o.id_usuario
        GROUP BY u.id_usuario
        ORDER BY total_observaciones DESC
        LIMIT 3;
    `;
    db.query(sql, (err, resultados) => {
        if (err) {
            console.error("Error al obtener el Top de Guardianes:", err);
            return res.status(500).json({ error: "Error interno en la base de datos" });
        }
        res.json(resultados);
    });
});

// --- RUTA: GUARDAR NUEVA OBSERVACIÓN ---
app.post('/api/guardar-observacion', uploadAvistamientos.single('foto'), (req, res) => {
    const { id_usuario, id_especie, latitud, longitud, fecha_avistamiento } = req.body;
    const rutaFoto = req.file ? '/Datos/subidas/avistamientos/' + req.file.filename : null;
    if (!rutaFoto) {
        return res.status(400).json({ error: "No se subió ninguna foto" });
    }

    const sql = "INSERT INTO Observaciones (id_usuario, id_especie, foto, latitud, longitud, fecha_avistamiento) VALUES (?, ?, ?, ?, ?, ?)";
    db.query(sql, [id_usuario, id_especie, rutaFoto, latitud, longitud, fecha_avistamiento], (err, result) => {
        if (err) {
            console.error("Error al guardar en la BD:", err);
            return res.status(500).json({ error: "Error interno del servidor" });
        }
        res.status(200).json({ mensaje: "¡Observación guardada!", ruta_imagen: rutaFoto });
    });
});

// --- RUTA: REGISTRO DE USUARIO ---
app.post('/api/registro', (req, res) => {
    const { nombre, apellido, correo, contrasenia } = req.body;

    const verificarSql = "SELECT * FROM Usuarios WHERE correo = ?";
    db.query(verificarSql, [correo], (err, filas) => {
        if (err) return res.status(500).json({ error: "Error interno del servidor" });
        if (filas.length > 0) return res.status(400).json({ error: "El correo electrónico ya está registrado." });

        const insertarSql = "INSERT INTO Usuarios (nombre, apellido, correo, contrasenia) VALUES (?, ?, ?, ?)";
        db.query(insertarSql, [nombre, apellido, correo, contrasenia], (err, resultado) => {
            if (err) return res.status(500).json({ error: "No se pudo crear la cuenta." });
            res.status(201).json({ mensaje: "¡Cuenta creada exitosamente!" });
        });
    });
});

// RUTA DE LOGIN REAL
app.post('/api/login', (req, res) => {
    const { correo, contrasenia } = req.body;

    // Buscamos al usuario en la BD (En un futuro usarás bcrypt para la contraseña)
    const sql = `SELECT id_usuario, nombre, avatar FROM Usuarios WHERE correo = ? AND contrasenia = ?`;
    
    db.query(sql, [correo, contrasenia], (err, result) => {
        if (err) return res.status(500).json({ error: "Error en el servidor" });
        
        if (result.length > 0) {
            // ¡El usuario existe y la contraseña es correcta!
            res.json({ exito: true, usuario: result[0] });
        } else {
            res.status(401).json({ exito: false, mensaje: "Correo o contraseña incorrectos" });
        }
    });
});

// --- RUTA: OBTENER PERFIL DE USUARIO ---
app.get('/api/perfil/:id', (req, res) => {
    const idUsuario = req.params.id;

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

// --- RUTA: EDITAR PERFIL (Con limpieza de archivos físicos) ---
app.put('/api/editar-perfil/:id', uploadPerfiles.single('avatar'), (req, res) => {
    const idUsuario = req.params.id;
    const { nombre, apellido, correo } = req.body;
    const rutaAvatarNuevo = req.file ? '/Datos/subidas/Perfiles/' + req.file.filename : null;

    if (rutaAvatarNuevo) {
        const sqlBuscar = "SELECT avatar FROM Usuarios WHERE id_usuario = ?";
        
        db.query(sqlBuscar, [idUsuario], (err, resultados) => {
            if (!err && resultados.length > 0 && resultados[0].avatar) {
                const avatarViejo = resultados[0].avatar;
                const rutaReal = path.join(__dirname, '..', avatarViejo);                
                fs.unlink(rutaReal, (errorFs) => {
                    if (errorFs) console.log("Aviso: No se encontró la foto vieja para borrarla.");
                    else console.log("🗑️ Foto vieja eliminada del servidor.");
                });
            }

            const sqlUpdate = "UPDATE Usuarios SET nombre = ?, apellido = ?, correo = ?, avatar = ? WHERE id_usuario = ?";
            db.query(sqlUpdate, [nombre, apellido, correo, rutaAvatarNuevo, idUsuario], (err, resultado) => {
                if (err) return res.status(500).json({ error: "Error en la base de datos" });
                res.status(200).json({ mensaje: "Perfil actualizado con éxito", nuevoAvatar: rutaAvatarNuevo });
            });
        });

    } else {
        const sql = "UPDATE Usuarios SET nombre = ?, apellido = ?, correo = ? WHERE id_usuario = ?";
        db.query(sql, [nombre, apellido, correo, idUsuario], (err, resultado) => {
            if (err) return res.status(500).json({ error: "Error en la base de datos" });
            res.status(200).json({ mensaje: "Perfil actualizado con éxito" });
        });
    }
});

// --- RUTA: MIS OBSERVACIONES (Dashboard Personal al estilo iNaturalist) ---
app.get('/api/mis-observaciones/:id', (req, res) => {
    const idUsuario = req.params.id;
    const busqueda = req.query.q || ''; // Para que el buscador funcione

    // 1. Consulta para la barra oscura de estadísticas
    const sqlStats = `
        SELECT 
            COUNT(id_observacion) AS total_observaciones,
            COUNT(DISTINCT id_especie) AS total_especies,
            SUM(CASE WHEN estatus_validacion = 'Validado' THEN 1 ELSE 0 END) AS total_validados
        FROM Observaciones 
        WHERE id_usuario = ?
    `;

    // 2. Consulta para la cuadrícula de fotos filtrada
    const sqlObs = `
        SELECT 
            o.id_observacion, o.foto, o.fecha_avistamiento, o.estatus_validacion, 
            e.nombre_comun, o.latitud, o.longitud
        FROM Observaciones o
        JOIN Especies e ON o.id_especie = e.id_especie
        WHERE o.id_usuario = ? 
        AND (e.nombre_comun LIKE ? OR o.estatus_validacion LIKE ?)
        ORDER BY o.fecha_avistamiento DESC
    `;
    
    const terminoBusqueda = `%${busqueda}%`;

    db.query(sqlStats, [idUsuario], (errStats, resultStats) => {
        if (errStats) return res.status(500).json({ error: "Error calculando estadísticas" });

        db.query(sqlObs, [idUsuario, terminoBusqueda, terminoBusqueda], (errObs, resultObs) => {
            if (errObs) return res.status(500).json({ error: "Error obteniendo observaciones" });
            
            res.json({
                estadisticas: {
                    observaciones: resultStats[0].total_observaciones || 0,
                    especies: resultStats[0].total_especies || 0,
                    validados: resultStats[0].total_validados || 0
                },
                observaciones: resultObs
            });
        });
    });
});

// ARRANCAR EL SERVIDOR
const PUERTO = 3000;
app.listen(PUERTO, () => {
    console.log(`🚀 Servidor de WildLens corriendo en el puerto ${PUERTO}`);
});