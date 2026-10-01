import { db } from "../../config/db.ts";
import {
  type Ejemplar,
  type EjemplarNuevo,
  type FiltrosEjemplar,
} from "./ejemplar.schema.ts";

const SELECT = `SELECT codigo_barras AS codigoBarras, isbn, estado 
                FROM ejemplar`;

export const ejemplarRepository = {
  findAll({ estado, limit = 50, offset = 0 }: FiltrosEjemplar) {
    const cond = [];
    const params = [];

    if (estado) {
      cond.push("estado LIKE ?");
      params.push(`%${estado}%`);
    }

    const WHERE = cond.length ? `WHERE ${cond.join(" AND ")}` : "";

    return db
      .prepare(`${SELECT} ${WHERE} ORDER BY codigoBarras LIMIT ? OFFSET ?`)
      .all(...params, limit, offset);
  },

  findByCodigoBarras(codigo_barras: string): Ejemplar {
    return db
      .prepare(`${SELECT} WHERE codigoBarras = ?`)
      .get(codigo_barras) as Ejemplar;
  },

  findByIsbn(isbn: string) {
    return db.prepare(`${SELECT} WHERE isbn = ?`).all(isbn);
  },

  insert(ejemplar: Ejemplar): Ejemplar {
    db.prepare(
      `
      INSERT INTO ejemplar (codigo_barras, isbn) 
      VALUES (@codigoBarras, @isbn)`,
    ).run(ejemplar);

    return this.findByCodigoBarras(ejemplar.codigoBarras);
  },

  countEjemplaresByIsbn(isbn: string): number {
    const filas = db
      .prepare(
        `
      SELECT COUNT(*) 
      FROM ejemplar
      WHERE isbn = ?`,
      )
      .get(isbn) as { n: number };

    return filas.n;
  },

  deleteByCodigoBarras(codigo_barras: string) {
    return db
      .prepare("DELETE FROM ejemplar WHERE codigo_barras = ?")
      .run(codigo_barras).changes;
  },

  updateEstado(codigo_barras: string, estado: string) {
    db.prepare(
      `
      UPDATE ejemplar
      SET estado = ?
      WHERE codigo_barras = ?`,
    ).run(estado, codigo_barras);

    return this.findByCodigoBarras(codigo_barras);
  },
};
