import { db } from "../../config/db";

const SELECT = `SELECT codigo_barras AS codigoBarras, isbn, estado 
                FROM ejemplar`;

export const ejemplarRepository = {
  findAll({ limit = 50, offset = 0 } = {}) {
    return db
      .prepare(`${SELECT} ORDER BY codigoBarras LIMIT ? OFFSET ?`)
      .all(limit, offset);
  },

  findByCodigoBarras(codigo_barras) {
    return db.prepare(`${SELECT} WHERE codigoBarras = ?`).get(codigo_barras);
  },

  insert(ejemplar) {
    db.prepare(
      `INSERT INTO ejemplar (codigo_barras, isbn, estado) 
      VALUES (@codigoBarras, @isbn, @estado)`,
    ).run(ejemplar);

    return this.findByCodigoBarras(ejemplar.codigo_barras);
  },

  countEjemplaresByIsbn(isbn) {
    db.prepare(
      `SELECT COUNT(codigo_barras) 
      FROM ejemplar
      WHERE isbn = ?`,
    ).get(isbn);
  },

  deleteByCodigoBarras(codigo_barras) {
    return db
      .prepare("DELETE FROM ejemplar WHERE codigo_barras = ?")
      .run(codigo_barras).changes;
  },

  updateEstado(codigo_barras, estado) {
    db.prepare(
      `UPDATE TABLE ejemplar
      SET estado = ?
      WHERE codigo_barras = ?`,
    ).run(estado, codigo_barras);

    return this.findByCodigoBarras(codigo_barras);
  },
};
