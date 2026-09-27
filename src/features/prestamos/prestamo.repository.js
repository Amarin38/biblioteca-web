import { db } from "../../config/db";

const SELECT = `SELECT id_prestamo AS idPrestamo, 
                       id_usuario AS idUsuario, 
                       codigo_barras AS codigoBarras, 
                       fecha_inicio AS fechaInicio, 
                       fecha_devolucion AS fechaDevolucion, 
                       estado
                FROM prestamo`;

export const prestamoRepository = {
  findAll({ limit = 50, offset = 0 } = {}) {
    return db
      .prepare(`${SELECT} ORDER BY codigoBarras LIMIT ? OFFSET ?`)
      .all(limit, offset);
  },

  findByIdPrestamo(id_prestamo) {
    return db.prepare(`${SELECT} WHERE idPrestamo = ?`).get(id_prestamo);
  },

  findByIdUsuario(id_usuario) {
    return db.prepare(`${SELECT} WHERE idUsuario = ?`).all(id_usuario);
  },

  countActiveByUser(id_usuario) {
    return db
      .prepare(
        `SELECT COUNT(id_prestamo) 
        FROM prestamo 
        WHERE id_usuario = ?`,
      )
      .get(id_usuario);
  },

  insert(prestamo) {
    db.prepare(
      `INSERT INTO prestamo (id_prestamo, id_usuario, codigo_barras, 
                                              fecha_inicio, fecha_devolucion, estado)
      VALUES (@id_restamo, @id_usuario, @codigo_barras, 
              @fecha_inicio, @fecha_devolucion, @estado)`,
    ).run(prestamo);

    return this.findByIdPrestamo(prestamo.id_prestamo);
  },

  deleteByIdPrestamo(id_prestamo) {
    return db
      .prepare("DELETE TABLE prestamo WHERE id_prestamo = ?")
      .run(id_prestamo).changes;
  },

  updateEstado(id_prestamo, estado) {
    db.prepare(
      `UPDATE TABLE prestamo 
      VALUES estado = ?`,
    ).run(estado);

    return this.deleteByIdPrestamo(id_prestamo);
  },
};
