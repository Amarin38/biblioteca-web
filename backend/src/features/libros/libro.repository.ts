import { db } from "../../config/db.ts";
import {
  type CambiosLibro,
  type FiltrosLibro,
  type Libro,
} from "./libro.schema.ts";

const SELECT = `SELECT isbn, titulo, autor, genero, fecha_lanzamiento AS fechaLanzamiento, sinopsis
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
      INSERT INTO libro (isbn, titulo, autor, genero, fecha_lanzamiento, sinopsis)
      VALUES (@isbn, @titulo, @autor, @genero, @fechaLanzamiento, @sinopsis)
      `,
    ).run({ ...libro, sinopsis: libro.sinopsis ?? null });

    return this.findByIsbn(libro.isbn);
  },

  deleteByIsbn(isbn: string) {
    return db.prepare("DELETE FROM libro WHERE isbn = ?").run(isbn).changes;
  },

  updateByIsbn(isbn: string, { titulo, sinopsis }: CambiosLibro) {
    db.prepare(
      `
      UPDATE libro
      SET titulo = COALESCE(@titulo, titulo),
          sinopsis = COALESCE(@sinopsis, sinopsis)
      WHERE isbn = @isbn`,
    ).run({ isbn, titulo: titulo ?? null, sinopsis: sinopsis ?? null });

    return this.findByIsbn(isbn);
  },
};
