PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS usuario (
    id_usuario  INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre      TEXT NOT NULL,
    email       TEXT NOT NULL UNIQUE, 
    tipo        TEXT NOT NULL CHECK (tipo IN ('socio', 'docente', 'normal')) 
);


CREATE TABLE IF NOT EXISTS libro (
    isbn                TEXT PRIMARY KEY,
    titulo              TEXT NOT NULL,
    autor               TEXT NOT NULL,
    genero              TEXT NOT NULL 
                        CHECK (genero IN ('ficción', 'no ficción', 'fantasía', 
                                          'ciencia ficción', 'misterio', 'thriller', 
                                          'romance', 'terror', 'aventura', 'novela histórica', 
                                          'biografía', 'autobiografía', 'ensayo', 'poesía', 'drama', 
                                          'autoayuda', 'infantil', 'juvenil', 'comedia', 'distopía', 
                                          'realismo mágico', 'cuento', 'historia', 'antropología', 
                                          'ciencia', 'divulgación científica', 'filosofía', 'psicología', 
                                          'sociología', 'economía', 'política')),
    fecha_lanzamiento   TEXT 
                        CHECK (fecha_lanzamiento IS NULL OR fecha_lanzamiento IS date(fecha_lanzamiento))
);


CREATE TABLE IF NOT EXISTS ejemplar (
    codigo_barras   TEXT PRIMARY KEY,
    isbn            TEXT NOT NULL REFERENCES libro(isbn) ON DELETE CASCADE,
    estado          TEXT NOT NULL DEFAULT 'prestado' 
                    CHECK (estado IN ('disponible', 'prestado', 'baja'))
);


CREATE TABLE IF NOT EXISTS prestamo (
    id_prestamo         INTEGER PRIMARY KEY AUTOINCREMENT,
    id_usuario          INTEGER NOT NULL REFERENCES usuario(id_usuario),
    id_ejemplar         TEXT NOT NULL REFERENCES ejemplar(codigo_barras),
    fecha_inicio        TEXT NOT NULL DEFAULT (date('now'))
                        CHECK (fecha_inicio IS NULL OR fecha_inicio IS date(fecha_inicio)),
    fecha_devolucion    TEXT NOT NULL
                        CHECK (fecha_devolucion IS NULL OR fecha_devolucion IS date(fecha_devolucion)),
    renovaciones        INTEGER NOT NULL DEFAULT 0,
    estado              TEXT NOT NULL DEFAULT 'activo' 
                        CHECK (estado IN ('activo', 'finalizado', 'vencido'))
);

CREATE TABLE IF NOT EXISTS pago_multa (
    id_pago         INTEGER PRIMARY KEY AUTOINCREMENT,
    id_prestamo     INTEGER NOT NULL REFERENCES prestamo(id_prestamo),
    monto           REAL NOT NULL CHECK (monto > 0),
    fecha           TEXT NOR NULL DEFAULT (date('now'))
                    CHECK (fecha IS NULL OR fecha IS date(fecha))
);


CREATE UNIQUE INDEX IF NOT EXISTS idx_prestamo_activo
    ON prestamo(id_ejemplar) WHERE estado <> 'finalizado';
