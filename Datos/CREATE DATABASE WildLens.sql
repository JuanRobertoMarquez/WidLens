CREATE DATABASE WildLens;
USE WildLens;

CREATE TABLE Usuarios(
    id_usuario INT PRIMARY KEY NOT NULL AUTO_INCREMENT,
    nombre VARCHAR(50) NOT NULL,
    apellido VARCHAR(50) NOT NULL,
    correo VARCHAR(100) NOT NULL,
    contrasenia VARCHAR(255) NOT NULL,
    fecha_de_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
    avatar VARCHAR(255) DEFAULT NULL
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
    
-- 1. INSERTAR USUARIOS (Mantenemos tu equipo + 1 bióloga invitada)
INSERT INTO Usuarios (nombre, apellido, correo, contrasenia, avatar) VALUES 
('Roberto', 'Marquez', 'roberto.m@ejemplo.com', '$2y$10$simulacionDeHashSeguro12345','/subidas/Perfiles/Roberto.jpg'),
('Darien', 'García', 'darien.g@ejemplo.com', '$2y$10$simulacionDeHashSeguro12345','/subidas/Perfiles/Loro.jpg'),
('Jesus', 'López', 'jesus.l@ejemplo.com', '$2y$10$simulacionDeHashSeguro12345','/subidas/Perfiles/Jesus.jpg'),
('Victoria', 'Monzalvo', 'vic.m@ejemplo.com', '$2y$10$simulacionDeHashSeguro12345','/subidas/Perfiles/Victoria.jpg'),
('Antonio', 'Ezpinoza', 'anito.biol@ejemplo.com', '$2y$10$simulacionDeHashSeguro12345','/subidas/Perfiles/Antonio.jpg');

INSERT INTO Especies (nombre_comun, estado_conservacion, imagen) VALUES 
('Ajolote de Xochimilco (A. mexicanum)', 'Peligro Crítico', '/subidas/avistamientos/ajolote_xochi.jpg'),
('Achoque de Pátzcuaro (A. dumerilii)', 'Peligro Crítico', '/subidas/avistamientos/achoque_patz.jpg'),
('Ajolote de Alchichica (A. taylori)', 'Peligro Crítico', '/subidas/avistamientos/ajolote_alchi.jpg'),
('Achoque de Zacapu (A. andersoni)', 'Peligro Crítico', '/subidas/avistamientos/achoque_zac.jpg');

-- 3. INSERTAR OBSERVACIONES (Con coordenadas reales de sus hábitats)
INSERT INTO Observaciones (id_usuario, id_especie, foto, latitud, longitud, fecha_avistamiento, estatus_validacion) VALUES 
-- Xochimilco, CDMX (Ajolote Mexicano)
(1, 1, '/subidas/avistamientos/ajolote_rosado_xochi.jpg', 19.26250000, -99.10260000, '2026-05-15 08:30:00', 'Validado'),
(3, 1, '/subidas/avistamientos/ajolote_pardo_canal.jpg', 19.27130000, -99.09150000, '2026-05-18 11:20:00', 'Pendiente'),
-- Lago de Pátzcuaro, Michoacán (Achoque de Pátzcuaro)
(2, 2, '/subidas/avistamientos/achoque_patzcuaro1.jpg', 19.55420000, -101.59330000, '2026-04-22 09:15:00', 'Validado'),
(4, 2, '/subidas/avistamientos/achoque_mich.jpg', 19.58210000, -101.62140000, '2026-05-02 16:45:00', 'Validado'),
-- Laguna de Alchichica, Puebla (Ajolote de Alchichica)
(1, 3, '/subidas/avistamientos/ajolote_alchichica_salino.jpg', 19.41670000, -97.39860000, '2026-05-10 14:00:00', 'Validado'),
-- Laguna de Zacapu, Michoacán (Achoque de Zacapu)
(5, 4, '/subidas/avistamientos/achoque_zacapu_fondo.jpg', 19.82470000, -101.79190000, '2026-05-19 10:10:00', 'Validado'),
-- Otro avistamiento reciente en Cuemanco, CDMX
(2, 1, '/subidas/avistamientos/ajolote_cuemanco.jpg', 19.28610000, -99.10420000, '2026-05-20 07:30:00', 'Pendiente');

-- 4. INSERTAR IDENTIFICACIONES (Comunidad validando los ajolotes)
INSERT INTO Identificaciones (id_observacion, id_usuario, id_especie) VALUES 
(1, 5, 1), -- Dra. Carmen valida el ajolote de Roberto en Xochimilco
(3, 1, 2), -- Roberto valida el achoque de Pátzcuaro de Darien
(4, 5, 2), -- Dra. Carmen valida el achoque de Areli
(5, 2, 3), -- Darien confirma la especie de Alchichica
(6, 3, 4); -- Jesus confirma el hallazgo en Zacapu

-- 5. INSERTAR INTERACCIONES (Comentarios en la plataforma)
INSERT INTO Interacciones (id_observacion, id_usuario, comentario_texto) VALUES 
(1, 4, '¡Qué maravilla ver uno en su hábitat natural! Se ve muy sano.'),
(1, 5, 'Excelente registro, Roberto. La coloración parda es la silvestre natural, los rosados son más de cautiverio.'),
(3, 1, 'Esos achoques de Michoacán son increíbles, son gigantes comparados con los de CDMX.'),
(5, 4, '¿El agua de Alchichica no es súper salada? Increíble que sobrevivan ahí.'),
(5, 5, 'Así es, Areli. El A. taylori evolucionó para soportar la salinidad de ese cráter.'),
(7, 3, 'Ojalá logren limpiar pronto esa zona de Cuemanco, hay mucha contaminación.');