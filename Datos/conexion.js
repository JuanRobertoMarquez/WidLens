// Importamos las librerías
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

// Inicializamos la aplicación
const app = express();

app.use(cors()); // Permite conexiones desde tu frontend
app.use(express.json()); // Permite que el servidor entienda datos en formato JSON

// --- CONFIGURACIÓN DE LA BASE DE DATOS ---
const db = mysql.createConnection({
    host: 'localhost',      // Usualmente localhost si trabajas en tu compu
    user: 'root',           // Tu usuario de MySQL (por defecto es root)
    password: '2023630816',           // Tu contraseña (déjalo vacío si usas XAMPP por defecto)
    database: 'Wild_Lens' // El nombre de la base de datos que vayas a crear
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

// --- ARRANCAR EL SERVIDOR ---
const PUERTO = 3000;
app.listen(PUERTO, () => {
    console.log(`🚀 Servidor corriendo en el puerto ${PUERTO}`);
});