CREATE DATABASE WildLens;
USE WildLens;

CREATE TABLE Usuarios(
    id_usuario INT PRIMARY KEY NOT NULL AUTO_INCREMENT,
    nombre VARCHAR(50) NOT NULL,
    apellido VARCHAR(50) NOT NULL,
    correo VARCHAR(100) NOT NULL,
    contrasenia VARCHAR(255) NOT NULL,
    fecha_de_registro DATETIME DEFAULT CURRENT_TIMESTAMP 
);

CREATE TABLE Especies(
    id_especie INT PRIMARY KEY NOT NULL AUTO_INCREMENT,
    nombre_comun VARCHAR(100) NOT NULL,
    estado_conservacion VARCHAR(50) NOT NULL,
    imagen VARCHAR(255) NOT NULL
);

CREATE TABLE Observaciones(
    id_observacion INT PRIMARY KEY NOT NULL AUTO_INCREMENT,
    id_usuario INT NOT NULL, 
    id_especie INT DEFAULT NULL,
    foto VARCHAR(255) NOT NULL,
    latitud DECIMAL(10,8) NOT NULL,
    longitud DECIMAL(11,8) NOT NULL,
    fecha_avistamiento DATETIME NOT NULL,
    estatus_validacion ENUM ('Pendiente', 'Validado') DEFAULT 'Pendiente',
    FOREIGN KEY (id_especie) REFERENCES Especies(id_especie),
    FOREIGN KEY (id_usuario) REFERENCES Usuarios(id_usuario)
);

CREATE TABLE Identificaciones(
    id_identificacion INT PRIMARY KEY NOT NULL AUTO_INCREMENT,
    id_observacion INT NOT NULL,
    id_usuario INT NOT NULL,
    id_especie INT NOT NULL,
    fecha_sugerencia DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(id_observacion) REFERENCES Observaciones(id_observacion),
    FOREIGN KEY(id_usuario) REFERENCES Usuarios(id_usuario),
    FOREIGN KEY(id_especie) REFERENCES Especies(id_especie)
);

CREATE TABLE Interacciones(
    id_interaccion INT PRIMARY KEY NOT NULL AUTO_INCREMENT,
    id_observacion INT NOT NULL, 
    id_usuario INT NOT NULL, 
    comentario_texto TEXT NOT NULL,
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(id_observacion) REFERENCES Observaciones(id_observacion),
    FOREIGN KEY(id_usuario) REFERENCES Usuarios(id_usuario)
    );
    
-- 1. INSERTAR USUARIOS
-- Omitimos id_usuario y fecha_de_registro porque se llenan solos.
-- Las contraseñas están simuladas como hashes para mantener las buenas prácticas.
INSERT INTO Usuarios (nombre, apellido, correo, contrasenia) VALUES 
('Roberto', 'Marquez', 'roberto.m@ejemplo.com', '$2y$10$simulacionDeHashSeguro12345'),
('Darien', 'García', 'darien.g@ejemplo.com', '$2y$10$simulacionDeHashSeguro12345'),
('Jesus', 'López', 'jesus.l@ejemplo.com', '$2y$10$simulacionDeHashSeguro12345'),
('Areli', 'Marquez', 'areli.m@ejemplo.com', '$2y$10$simulacionDeHashSeguro12345');

-- 2. INSERTAR ESPECIES
-- Omitimos id_especie
INSERT INTO Especies (nombre_comun, estado_conservacion, imagen) VALUES 
('Ajolote Mexicano', 'Peligro Crítico', 'https://images.unsplash.com/photo-1698778486518-202396e9cbbe'),
('Cacomixtle Norteño', 'Preocupación Menor', 'https://images.unsplash.com/photo-1615826932727-3108c4a17ab5'),
('Colibrí Berilo','Preocupación Menor', 'https://images.unsplash.com/photo-1444464666168-49b626f49cb9'),
('Gorrión Doméstico','Preocupación Menor', 'https://images.unsplash.com/photo-1550853024-fae8cd4be47f');

-- 3. INSERTAR OBSERVACIONES
-- Relacionamos a los usuarios (1 a 4) con las especies (1 a 4).
INSERT INTO Observaciones (id_usuario, id_especie, foto, latitud, longitud, fecha_avistamiento, estatus_validacion) VALUES 
-- Roberto encuentra un ajolote en Xochimilco
(1, 1, 'ajolote_obs1.jpg', 19.26250000, -99.10260000, '2026-03-25 10:30:00', 'Validado'),
-- Darien avista un cacomixtle en Nezahualcóyotl
(2, 2, 'caco_neza.jpg', 19.39580000, -98.99560000, '2026-04-10 21:15:00', 'Pendiente'),
-- Jesus fotografía un colibrí cerca de Zacatenco
(3, 3, 'colibri_zacatenco.jpg', 19.50440000, -99.14670000, '2026-04-20 08:45:00', 'Validado'),
-- Areli registra un gorrión
(4, 4, 'gorrion_urbano.jpg', 19.43260000, -99.13320000, '2026-05-01 14:20:00', 'Validado');

-- 4. INSERTAR IDENTIFICACIONES
-- Usuarios validando las fotos de otros
INSERT INTO Identificaciones (id_observacion, id_usuario, id_especie) VALUES 
(1, 4, 1), -- Areli confirma que la foto 1 (de Roberto) es un Ajolote (Especie 1)
(2, 1, 2), -- Roberto sugiere que la foto 2 (de Darien) es un Cacomixtle (Especie 2)
(3, 2, 3); -- Darien confirma el Colibrí de Jesus

-- 5. INSERTAR INTERACCIONES (COMENTARIOS)
INSERT INTO Interacciones (id_observacion, id_usuario, comentario_texto) VALUES 
(1, 2, '¡Qué increíble hallazgo! Hay que cuidar mucho esa zona de los canales.'),
(2, 3, 'Yo también vi uno ayer cruzando los cables por mi calle.'),
(3, 1, 'Excelente toma, los colores de las plumas se ven geniales.');
    
