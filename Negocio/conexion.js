const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs'); // Herramienta nativa para borrar archivos físicos
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const bcrypt = require('bcrypt');

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

// --- RUTA: REGISTRO DE USUARIO (Con envío de correo de verificación) ---
app.post('/api/registro', async (req, res) => {
    const { nombre, apellido, correo, contrasenia } = req.body;

    // 1. Verificamos si el correo ya existe
    const verificarSql = "SELECT * FROM Usuarios WHERE correo = ?";
    db.query(verificarSql, [correo], async (err, filas) => {
        if (err) return res.status(500).json({ error: "Error interno del servidor" });
        if (filas.length > 0) return res.status(400).json({ error: "El correo electrónico ya está registrado." });

        try {
            // 2. Encriptamos la contraseña
            const saltRounds = 10;
            const contraseniaEncriptada = await bcrypt.hash(contrasenia, saltRounds);
            
            // 3. Generamos el token de verificación
            const tokenVerificacion = crypto.randomBytes(32).toString('hex');

            // 4. Guardamos en la base de datos (cuenta_verificada es FALSE por defecto)
            const insertarSql = "INSERT INTO Usuarios (nombre, apellido, correo, contrasenia, token_verificacion) VALUES (?, ?, ?, ?, ?)";
            db.query(insertarSql, [nombre, apellido, correo, contraseniaEncriptada, tokenVerificacion], (errInsert, resultado) => {
                if (errInsert) return res.status(500).json({ error: "No se pudo crear la cuenta." });

                // 5. Preparamos y enviamos el correo
                const enlaceVerificacion = `http://127.0.0.1:5500/Presentacion/paginas/verificar.html?token=${tokenVerificacion}`; 
                
                const opcionesCorreo = {
                    from: '"Equipo WildLens" <tu_correo@gmail.com>', // Cambia por el correo que usas en Nodemailer
                    to: correo,
                    subject: '🌿 Verifica tu cuenta de WildLens',
                    html: `
                        <div style="font-family: Arial, sans-serif; text-align: center; color: #333;">
                            <h2 style="color: #2B7055;">¡Bienvenido a WildLens, ${nombre}!</h2>
                            <p>Gracias por unirte a nuestra red de guardianes. Para poder iniciar sesión, necesitas verificar tu correo electrónico haciendo clic en el siguiente botón:</p>
                            <a href="${enlaceVerificacion}" style="background-color: #2B7055; color: white; padding: 12px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0;">Verificar mi cuenta</a>
                            <p style="font-size: 12px; color: #999;">Si no creaste esta cuenta, puedes ignorar este mensaje.</p>
                        </div>
                    `
                };

                transporter.sendMail(opcionesCorreo, (errorCorreo) => {
                    if (errorCorreo) console.error("Error enviando correo de verificación:", errorCorreo);
                });

                res.status(201).json({ mensaje: "¡Cuenta creada exitosamente! Revisa tu bandeja de entrada para verificar tu correo." });
            });
        } catch (errorHash) {
            res.status(500).json({ error: "Error de seguridad al procesar la cuenta." });
        }
    });
});

// --- RUTA DE LOGIN REAL (Actualizada con Bcrypt) ---
app.post('/api/login', (req, res) => {
    const { correo, contrasenia } = req.body;

    // 1. Buscamos al usuario SOLO por el correo y traemos su contraseña encriptada
    const sql = `SELECT id_usuario, nombre, avatar, contrasenia AS hashGuardado, cuenta_verificada FROM Usuarios WHERE correo = ?`;
    
    db.query(sql, [correo], async (err, result) => {
        if (err) return res.status(500).json({ error: "Error en el servidor" });
        
        if (result.length > 0) {
            const usuario = result[0];

            if (!usuario.cuenta_verificada) {
                return res.status(401).json({ exito: false, mensaje: "Debes verificar tu correo antes de iniciar sesión." });
            }
            
            try {
                // 2. Comparamos la contraseña que escribió con el hash de la BD
                const coincide = await bcrypt.compare(contrasenia, usuario.hashGuardado);

                if (coincide) {
                    // 3. ¡Son iguales! Quitamos la contraseña de los datos por seguridad antes de responder
                    delete usuario.hashGuardado;
                    res.json({ exito: true, usuario: usuario });
                } else {
                    res.status(401).json({ exito: false, mensaje: "Correo o contraseña incorrectos" });
                }
            } catch (errorHash) {
                console.error("Error al comparar contraseñas:", errorHash);
                res.status(500).json({ error: "Error interno procesando la seguridad" });
            }
        } else {
            // El correo no existe
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

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'juanrobertomarquez1@gmail.com', // El correo de WildLens
        pass: 'dhnlfrmxreynktds' 
    }
});

// --- RUTA: SOLICITAR RECUPERACIÓN DE CONTRASEÑA ---
app.post('/api/recuperar-password', (req, res) => {
    const { correo } = req.body;

    const sqlBuscar = `SELECT id_usuario, nombre FROM Usuarios WHERE correo = ? LIMIT 1`;
    db.query(sqlBuscar, [correo], (err, result) => {
        if (err) return res.status(500).json({ error: "Error en el servidor" });
        
        if (result.length > 0) {
            const usuario = result[0];
            const tokenReset = crypto.randomBytes(32).toString('hex');
            
            // Guardar el token en la tabla Usuarios con expiración de 1 hora
            const sqlUpdate = `UPDATE Usuarios SET token_recuperacion = ?, expiracion_token = DATE_ADD(NOW(), INTERVAL 1 HOUR) WHERE correo = ?`;
            
            db.query(sqlUpdate, [tokenReset, correo], (errUpdate) => {
                if (errUpdate) return console.error("Error guardando token:", errUpdate);

                    const enlaceReset = `http://127.0.0.1:5500/Presentacion/paginas/recuperacion.html?token=${tokenReset}`;

                const opcionesCorreo = {
                    from: '"Equipo WildLens" <juanrobertomarquez1@gmail.com>',
                    to: correo,
                    subject: '🌿 Recupera tu contraseña de WildLens',
                    html: `
                        <h2>¡Hola, ${usuario.nombre}!</h2>
                        <p>Haz clic en el siguiente botón para crear una nueva contraseña:</p>
                        <a href="${enlaceReset}" style="background-color: #2B7055; color: white; padding: 12px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Restablecer Contraseña</a>
                    `
                };

                transporter.sendMail(opcionesCorreo);
            });
        }
        // Siempre respondemos éxito por seguridad
        res.json({ exito: true, mensaje: "Si el correo existe, enviamos un enlace de recuperación." });
    });
});

// --- RUTA: RESTABLECER LA CONTRASEÑA ---
app.post('/api/restablecer-password', async (req, res) => {
    const { token, nuevaContrasenia } = req.body;

    // Buscamos a un usuario que tenga ese token y que no haya expirado
    const sqlBuscar = `SELECT id_usuario FROM Usuarios WHERE token_recuperacion = ? AND expiracion_token > NOW() LIMIT 1`;
    
    db.query(sqlBuscar, [token], async (err, result) => {
        if (err) return res.status(500).json({ error: "Error en el servidor" });
        
        if (result.length === 0) {
            return res.status(400).json({ error: "El enlace es inválido o ha expirado." });
        }

        const idUsuario = result[0].id_usuario;
        
        try {
            const saltRounds = 10;
            const contraseniaEncriptada = await bcrypt.hash(nuevaContrasenia, saltRounds);

            // Actualizamos la contraseña y limpiamos los tokens de recuperación
            const sqlUpdate = `UPDATE Usuarios SET contrasenia = ?, token_recuperacion = NULL, expiracion_token = NULL WHERE id_usuario = ?`;
            
            db.query(sqlUpdate, [contraseniaEncriptada, idUsuario], (errUpdate) => {
                if (errUpdate) return res.status(500).json({ error: "No se pudo actualizar la contraseña." });
                res.status(200).json({ mensaje: "Contraseña actualizada correctamente." });
            });
        } catch (errorHash) {
            res.status(500).json({ error: "Error al procesar la contraseña." });
        }
    });
});

// --- RUTA: VERIFICAR CUENTA ---
app.get('/api/verificar-cuenta', (req, res) => {
    const token = req.query.token;

    if (!token) return res.status(400).json({ error: "Token no proporcionado" });

    // Ahora pedimos también el estado de la cuenta
    const sqlBuscar = `SELECT id_usuario, cuenta_verificada FROM Usuarios WHERE token_verificacion = ? LIMIT 1`;
    
    db.query(sqlBuscar, [token], (err, result) => {
        if (err) return res.status(500).json({ error: "Error en el servidor" });
        
        if (result.length === 0) {
            return res.status(400).json({ error: "El enlace es inválido o no existe." });
        }

        const usuario = result[0];

        // Si ya estaba verificada, le avisamos al frontend sin marcar error
        if (usuario.cuenta_verificada) {
            return res.status(200).json({ mensaje: "Tu cuenta ya estaba verificada previamente.", yaVerificada: true });
        }

        // Si no estaba verificada, la activamos (Nota: Ya no borramos el token)
        const sqlUpdate = `UPDATE Usuarios SET cuenta_verificada = TRUE WHERE id_usuario = ?`;
        
        db.query(sqlUpdate, [usuario.id_usuario], (errUpdate) => {
            if (errUpdate) return res.status(500).json({ error: "No se pudo verificar la cuenta." });
            
            res.status(200).json({ mensaje: "¡Tu cuenta ha sido verificada con éxito!" });
        });
    });
});

// ARRANCAR EL SERVIDOR
const PUERTO = 3000;
app.listen(PUERTO, () => {
    console.log(`🚀 Servidor de WildLens corriendo en el puerto ${PUERTO}`);
});