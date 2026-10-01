import { db } from "../../config/db.ts";
import { type FiltrosLibro, type Libro } from "./libro.schema.ts";

const SELECT = `SELECT isbn, titulo, autor, genero, fecha_lanzamiento AS fechaLanzamiento
                FROM libro`;

export const libroRepository = {
  findAll({ titulo, autor, genero, limit = 50, offset = 0 }: FiltrosLibro) {
    const cond = [];
    const params = [];

    if (titulo) {
      cond.push("titulo LIKE ?");
      params.push(`%${titulo}%`);
    }

    if (autor) {
      cond.push("autor LIKE ?");
      params.push(`%${autor}%`);
    }

    if (genero) {
      cond.push("genero LIKE ?");
      params.push(`%${genero}%`);
    }

    const WHERE = cond.length ? `WHERE ${cond.join(" AND ")}` : "";

    return db
      .prepare(`${SELECT} ${WHERE} ORDER BY titulo LIMIT ? OFFSET ?`)
      .all(...params, limit, offset);
  },

  findByIsbn(isbn: string) {
    return db.prepare(`${SELECT} WHERE isbn = ?`).get(isbn) as Libro;
  },

  insert(libro: Libro): Libro {
    db.prepare(
      `
      INSERT INTO libro (isbn, titulo, autor, genero, fecha_lanzamiento)
      VALUES (@isbn, @titulo, @autor, @genero, @fechaLanzamiento)
      `,
    ).run(libro);

    return this.findByIsbn(libro.isbn);
  },

  deleteByIsbn(isbn: string) {
    return db.prepare("DELETE FROM libro WHERE isbn = ?").run(isbn).changes;
  },

  updateTituloByIsbn(isbn: string, titulo: string) {
    db.prepare(
      `
      UPDATE libro
      SET titulo = ? 
      WHERE isbn = ?`,
    ).run(titulo, isbn);

    return this.findByIsbn(isbn);
  },
};
