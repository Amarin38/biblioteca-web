PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS usuario (
    id_usuario  INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre      TEXT NOT NULL,
    email       TEXT NOT NULL UNIQUE, 
    tipo        TEXT NOT NULL CHECK (tipo IN ('socio', 'docente', 'normal')) 
);


CREATE TABLE IF NOT EXISTS libro (
    isbn                TEXT PRIMARY KEY,
    nombre              TEXT NOT NULL,
    autor               TEXT NOT NULL,
    fecha_lanzamiento   TEXT
);


CREATE TABLE IF NOT EXISTS ejemplar (
    codigo_barras   TEXT PRIMARY KEY,
    isbn            TEXT NOT NULL REFERENCES libro(isbn) ON DELETE CASCADE,
    estado          TEXT NOT NULL DEFAULT 'disponible' 
                    CHECK (estado IN ('disponible', 'prestado', 'baja'))
);


CREATE TABLE IF NOT EXISTS prestamo (
    id_prestamo         INTEGER PRIMARY KEY AUTOINCREMENT,
    id_usuario          INTEGER NOT NULL REFERENCES usuario(id_usuario),
    codigo_barras       TEXT NOT NULL REFERENCES ejemplar(codigo_barras),
    fecha_inicio        TEXT NOT NULL,
    fecha_devolucion    TEXT,
    estado              TEXT NOT NULL DEFAULT 'activo' 
                        CHECK (estado IN ('activo', 'finalizado', 'vencido'))
);


CREATE UNIQUE INDEX IF NOT EXISTS idx_prestamo_activo
    ON prestamo(codigo_barras) WHERE estado <> 'finalizado';
