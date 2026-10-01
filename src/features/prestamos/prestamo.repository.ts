import { db } from "../../config/db.ts";
import {
  type Estado,
  type FiltrosPrestamo,
  type Prestamo,
  type Multa,
  type Monto,
} from "./prestamo.schema.ts";

const SELECT = `SELECT id_prestamo AS idPrestamo, 
                       id_usuario AS idUsuario, 
                       id_ejemplar AS idEjemplar, 
                       fecha_inicio AS fechaInicio, 
                       fecha_devolucion AS fechaDevolucion, 
                       renovaciones,
                       estado
                FROM prestamo`;

export const prestamoRepository = {
  findAll({ idEjemplar, estado, limit = 50, offset = 0 }: FiltrosPrestamo) {
    const cond = [];
    const params = [];

    if (idEjemplar) {
      cond.push("idEjemplar LIKE ?");
      params.push(`%${idEjemplar}%`);
    }

    if (estado) {
      cond.push("estado LIKE ?");
      params.push(`%${estado}%`);
    }

    const WHERE = cond.length ? `WHERE ${cond.join(" AND ")}` : "";

    return db
      .prepare(`${SELECT} ${WHERE} ORDER BY estado LIMIT ? OFFSET ?`)
      .all(...params, limit, offset);
  },

  findByIdPrestamo(id_prestamo: number): Prestamo {
    return db
      .prepare(`${SELECT} WHERE idPrestamo = ?`)
      .get(id_prestamo) as Prestamo;
  },

  findByIdUsuario(id_usuario: number): Prestamo[] {
    return db
      .prepare(`${SELECT} WHERE idUsuario = ?`)
      .all(id_usuario) as Prestamo[];
  },

  countActiveByUser(id_usuario: number): number {
    return db
      .prepare(
        `
        SELECT COUNT(*) 
        FROM prestamo 
        WHERE id_usuario = ?`,
      )
      .get(id_usuario) as number;
  },

  insert(idUsuario: number, idEjemplar: string, dias: number): Prestamo {
    const info = db
      .prepare(
        `
      INSERT INTO prestamo (id_usuario, id_ejemplar, fecha_devolucion)
      VALUES (?, ?, date('now', '+' || ? || ' days'))`,
      )
      .run(idUsuario, idEjemplar, dias);

    return this.findByIdPrestamo(Number(info.lastInsertRowid));
  },

  deleteByIdPrestamo(id_prestamo: number): number {
    return db
      .prepare("DELETE TABLE prestamo WHERE id_prestamo = ?")
      .run(id_prestamo).changes;
  },

  updateEstado(id_prestamo: number, estado: Estado): Prestamo {
    db.prepare(
      `
      UPDATE prestamo 
      VALUES estado = ?
      WHERE idPrestamo = ?`,
    ).run(estado, id_prestamo);

    return this.findByIdPrestamo(id_prestamo);
  },

  // pago multas
  calcularMulta(idPrestamo: number): Multa {
    return db
      .prepare(
        `
        SELECT 
          MAX(0, CAST(julianday(COALESCE(p.fecha_devolucion, date('now'))) 
                    - julianday(p.fecha_vencimiento) AS INTEGER)) AS diasAtraso,
          COALESCE((SELECT SUM(monto) FROM pago_multa WHERE id_prestamo = p.id_prestamo), 0) AS pagado
        FROM prestamo p
        WHERE p.id_prestamo = ?
        `,
      )
      .get(idPrestamo) as Multa;
  },

  finalizarPrestamo(idPrestamo: number): void {
    db.prepare(
      `
               UPDATE prestamo 
               SET estado = "finalizado", fecha_devolucion = date("now")
               WHERE id_prestamo = ?
               `,
    ).run(idPrestamo);
  },

  insertPago(idPrestamo: number, monto: Monto): void {
    db.prepare(
      `
               INSERT INTO pago_multa (id_prestamo, monto) 
               VALUES (?, ?)
               `,
    ).run(idPrestamo, monto);
  },

  renovarPrestamo(idPrestamo: number, dias: number): void {
    db.prepare(
      `
               UPDATE prestamo
               SET fecha_vencimiento = date(fecha_vencimiento, '+' || ? || ' days'),
                 renovaciones = renovaciones + 1
               WHERE id_prestamo = ?
               `,
    ).run(idPrestamo, dias);
  },
};
