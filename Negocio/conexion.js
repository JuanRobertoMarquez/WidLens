const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs'); 
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

const app = express();
app.use(cors()); 
app.use(express.json()); 

// --- 1. CONFIGURACIÓN DE CLOUDINARY ---
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// --- 2. CONFIGURACIÓN DE STORAGE (MULTER + CLOUDINARY) ---
const storageAvistamientos = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'wildlens_avistamientos', 
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp']
  },
});
const uploadAvistamientos = multer({ storage: storageAvistamientos });

const storagePerfiles = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: 'wildlens_perfiles', 
      allowed_formats: ['jpg', 'png', 'jpeg', 'webp']
    },
});
const uploadPerfiles = multer({ storage: storagePerfiles });

// --- 3. CONEXIÓN A LA BASE DE DATOS ---
const db = mysql.createConnection({
    host: 'gateway01.us-east-1.prod.aws.tidbcloud.com',      
    port: 4000, 
    user: '266QR9U7MSUDEEJ.root',           
    password: 'KsDl3PVbbYLtbvVJ',          
    database: 'WildLens',
    ssl: {
        minVersion: 'TLSv1.2',
        rejectUnauthorized: true 
    }
});

db.connect((error) => {
    if (error) {
        console.error('❌ Error conectando a la base de datos:', error.message);
        return;
    }
    console.log('✅ Conectado exitosamente a la base de datos MySQL');
});

app.use('/Datos', express.static(path.join(__dirname, '../Datos')));

// --- 4. CONFIGURACIÓN DE CORREO (NODEMAILER) ---
// Aquí ya está tu nueva contraseña lista y configurada para Render
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'juanrobertomarquez1@gmail.com', 
        pass: 'pcxrjissfuunxpvf' 
    },
    tls: {
        rejectUnauthorized: false 
    }
});

// --- 5. RUTAS DE LA API ---

app.get('/', (req, res) => {
    res.send('<h1>¡El Backend de WildLens está en línea! 🌿</h1><p>Las rutas de la API están funcionando correctamente.</p>');
});

app.get('/api/estado', (req, res) => {
    res.json({ mensaje: '¡El servidor de WildLens está funcionando al 100%!' });
});

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

app.post('/api/guardar-observacion', uploadAvistamientos.single('foto'), (req, res) => {
    const { id_usuario, id_especie, latitud, longitud, fecha_avistamiento } = req.body;
    const rutaFoto = req.file ? req.file.path : null;    
    
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

app.post('/api/registro', async (req, res) => {
    const { nombre, apellido, correo, contrasenia } = req.body;

    const verificarSql = "SELECT * FROM Usuarios WHERE correo = ?";
    db.query(verificarSql, [correo], async (err, filas) => {
        if (err) return res.status(500).json({ error: "Error interno del servidor" });
        if (filas.length > 0) return res.status(400).json({ error: "El correo electrónico ya está registrado." });

        try {
            const saltRounds = 10;
            const contraseniaEncriptada = await bcrypt.hash(contrasenia, saltRounds);
            const tokenVerificacion = crypto.randomBytes(32).toString('hex');

            const insertarSql = "INSERT INTO Usuarios (nombre, apellido, correo, contrasenia, token_verificacion) VALUES (?, ?, ?, ?, ?)";
            db.query(insertarSql, [nombre, apellido, correo, contraseniaEncriptada, tokenVerificacion], async (errInsert, resultado) => {
                if (errInsert) return res.status(500).json({ error: "No se pudo crear la cuenta." });

                const enlaceVerificacion = `http://wildlens.free.nf/Presentacion/paginas/verificar.html?token=${tokenVerificacion}`; 
                
                const opcionesCorreo = {
                    from: '"Equipo WildLens" <juanrobertomarquez1@gmail.com>', 
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

                try {
                    await transporter.sendMail(opcionesCorreo);
                    res.status(201).json({ mensaje: "¡Cuenta creada exitosamente! Revisa tu bandeja de entrada para verificar tu correo." });
                } catch (errorCorreo) {
                    console.error("❌ Error enviando correo:", errorCorreo);
                    db.query("DELETE FROM Usuarios WHERE correo = ?", [correo]);
                    res.status(500).json({ error: "No pudimos enviar el correo de verificación. Intenta nuevamente." });
                }
            });
        } catch (errorHash) {
            res.status(500).json({ error: "Error de seguridad al procesar la cuenta." });
        }
    });
});

app.post('/api/login', (req, res) => {
    const { correo, contrasenia } = req.body;

    const sql = `SELECT id_usuario, nombre, avatar, contrasenia AS hashGuardado, cuenta_verificada FROM Usuarios WHERE correo = ?`;
    
    db.query(sql, [correo], async (err, result) => {
        if (err) return res.status(500).json({ error: "Error en el servidor" });
        
        if (result.length > 0) {
            const usuario = result[0];

            if (!usuario.cuenta_verificada) {
                return res.status(401).json({ exito: false, mensaje: "Debes verificar tu correo antes de iniciar sesión." });
            }
            
            try {
                const coincide = await bcrypt.compare(contrasenia, usuario.hashGuardado);

                if (coincide) {
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
            res.status(401).json({ exito: false, mensaje: "Correo o contraseña incorrectos" });
        }
    });
});

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

app.put('/api/editar-perfil/:id', uploadPerfiles.single('avatar'), (req, res) => {
    const idUsuario = req.params.id;
    const { nombre, apellido, correo } = req.body;
    const rutaAvatarNuevo = req.file ? req.file.path : null;

    if (rutaAvatarNuevo) {
        const sqlUpdate = "UPDATE Usuarios SET nombre = ?, apellido = ?, correo = ?, avatar = ? WHERE id_usuario = ?";
        db.query(sqlUpdate, [nombre, apellido, correo, rutaAvatarNuevo, idUsuario], (err, resultado) => {
            if (err) return res.status(500).json({ error: "Error en la base de datos al actualizar avatar" });
            res.status(200).json({ mensaje: "Perfil actualizado con éxito", nuevoAvatar: rutaAvatarNuevo });
        });
    } else {
        const sql = "UPDATE Usuarios SET nombre = ?, apellido = ?, correo = ? WHERE id_usuario = ?";
        db.query(sql, [nombre, apellido, correo, idUsuario], (err, resultado) => {
            if (err) return res.status(500).json({ error: "Error en la base de datos" });
            res.status(200).json({ mensaje: "Perfil actualizado con éxito" });
        });
    }
});

app.get('/api/mis-observaciones/:id', (req, res) => {
    const idUsuario = req.params.id;
    const busqueda = req.query.q || ''; 

    const sqlStats = `
        SELECT 
            COUNT(id_observacion) AS total_observaciones,
            COUNT(DISTINCT id_especie) AS total_especies,
            SUM(CASE WHEN estatus_validacion = 'Validado' THEN 1 ELSE 0 END) AS total_validados
        FROM Observaciones 
        WHERE id_usuario = ?
    `;

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

app.post('/api/recuperar-password', (req, res) => {
    const { correo } = req.body;

    const sqlBuscar = `SELECT id_usuario, nombre FROM Usuarios WHERE correo = ? LIMIT 1`;
    db.query(sqlBuscar, [correo], (err, result) => {
        if (err) return res.status(500).json({ error: "Error en el servidor" });
        
        if (result.length > 0) {
            const usuario = result[0];
            const tokenReset = crypto.randomBytes(32).toString('hex');
            
            const sqlUpdate = `UPDATE Usuarios SET token_recuperacion = ?, expiracion_token = DATE_ADD(NOW(), INTERVAL 1 HOUR) WHERE correo = ?`;
            
            db.query(sqlUpdate, [tokenReset, correo], (errUpdate) => {
                if (errUpdate) return console.error("Error guardando token:", errUpdate);

                const enlaceReset = `http://wildlens.free.nf/Presentacion/paginas/recuperacion.html?token=${tokenReset}`;

                const opcionesCorreo = {
                    from: '"Equipo WildLens" <juanrobertomarquez1@gmail.com>',
                    to: correo,
                    subject: '🌿 Recupera tu contraseña de WildLens',
                    html: `
                        <div style="font-family: Arial, sans-serif; text-align: center; color: #333;">
                            <h2 style="color: #2B7055;">¡Hola, ${usuario.nombre}!</h2>
                            <p>Haz clic en el siguiente botón para crear una nueva contraseña:</p>
                            <a href="${enlaceReset}" style="background-color: #2B7055; color: white; padding: 12px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Restablecer Contraseña</a>
                        </div>
                    `
                };

                transporter.sendMail(opcionesCorreo);
            });
        }
        res.json({ exito: true, mensaje: "Si el correo existe, enviamos un enlace de recuperación." });
    });
});

app.post('/api/restablecer-password', async (req, res) => {
    const { token, nuevaContrasenia } = req.body;

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

app.get('/api/verificar-cuenta', (req, res) => {
    const token = req.query.token;

    if (!token) return res.status(400).json({ error: "Token no proporcionado" });

    const sqlBuscar = `SELECT id_usuario, cuenta_verificada FROM Usuarios WHERE token_verificacion = ? LIMIT 1`;
    
    db.query(sqlBuscar, [token], (err, result) => {
        if (err) return res.status(500).json({ error: "Error en el servidor" });
        
        if (result.length === 0) {
            return res.status(400).json({ error: "El enlace es inválido o no existe." });
        }

        const usuario = result[0];

        if (usuario.cuenta_verificada) {
            return res.status(200).json({ mensaje: "Tu cuenta ya estaba verificada previamente.", yaVerificada: true });
        }

        const sqlUpdate = `UPDATE Usuarios SET cuenta_verificada = TRUE WHERE id_usuario = ?`;
        
        db.query(sqlUpdate, [usuario.id_usuario], (errUpdate) => {
            if (errUpdate) return res.status(500).json({ error: "No se pudo verificar la cuenta." });
            
            res.status(200).json({ mensaje: "¡Tu cuenta ha sido verificada con éxito!" });
        });
    });
});

app.get('/api/login-imagen-aleatoria', (req, res) => {
    const sql = `
        SELECT 
            o.foto, 
            e.nombre_comun AS nombre_comun, 
            u.nombre AS nombre_usuario, 
            u.avatar 
        FROM Observaciones o 
        JOIN Usuarios u ON o.id_usuario = u.id_usuario 
        LEFT JOIN Especies e ON o.id_especie = e.id_especie
        ORDER BY RAND() LIMIT 1
    `;
    
    db.query(sql, (err, result) => {
        if (err) {
            console.error("Error buscando imagen aleatoria:", err);
            return res.status(500).json({ error: "Error en el servidor" });
        }
        
        if (result.length > 0) {
            res.json(result[0]); 
        } else {
            res.status(404).json({ error: "Aún no hay observaciones en la base de datos" });
        }
    });
});

const PUERTO = process.env.PORT || 3000;
app.listen(PUERTO, () => {
    console.log(`🚀 Servidor de WildLens corriendo en el puerto ${PUERTO}`);
});