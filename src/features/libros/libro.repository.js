import { db } from "../../config/db";

const SELECT = `
    SELECT isbn, nombre, autor, fecha_lanzamiento AS fechaLanzamiento
    FROM libro`;

export const libroRepository = {
  findAll({ limit = 50, offset = 0 } = {}) {
    return db
      .prepare(`${SELECT} ORDER BY nombre LIMIT ? OFFSET ?`)
      .all(limit, offset);
  },

  findByIsbn(isbn) {
    return db.prepare(`${SELECT} WHERE isbn = ?`).get(isbn);
  },

  insert(libro) {
    db.prepare(
      `INSERT INTO libro (isbn, nombre, autor, fecha_lanzamiento)
      VALUES (@isbn, @nombre, @autor, @fechaLanzamiento)
      `,
    ).run(libro);

    return this.findByIsbn(isbn);
  },

  deleteByIsbn(isbn) {
    return db.prepare("DELETE FROM libro WHERE isbn = ?").run(isbn).changes;
  },

  updateNombreByIsbn(isbn, nombre) {
    db.prepare(
      `UPDATE TABLE libro
      SET nombre = ? 
      WHERE isbn = ?`,
    ).run(nombre, isbn);

    return this.findByIsbn(isbn);
  },
};
