import { Router, type Request, type Response } from "express";
import { db } from "../../config/db.ts";

// Reporte de la biblioteca: totales y rankings calculados con consultas SQL de solo lectura.
// Son datos agregados (no incluye datos personales), por eso el endpoint es público.
const cuenta = (sql: string, ...params: unknown[]) =>
  (db.prepare(sql).get(...params) as { n: number }).n;

// Un préstamo está vencido si no se devolvió y pasó su fecha límite (o ya figura como vencido)
const VENCIDO =
  "(estado <> 'finalizado' AND (estado = 'vencido' OR fecha_vencimiento < date('now')))";

export const reporteRepository = {
  resumen() {
    const ejemplares = Object.fromEntries(
      (
        db
          .prepare("SELECT estado, COUNT(*) AS n FROM ejemplar GROUP BY estado")
          .all() as { estado: string; n: number }[]
      ).map((f) => [f.estado, f.n]),
    );
    const vencidos = cuenta(
      `SELECT COUNT(*) AS n FROM prestamo WHERE ${VENCIDO}`,
    );
    const finalizados = cuenta(
      "SELECT COUNT(*) AS n FROM prestamo WHERE estado = 'finalizado'",
    );
    const total = cuenta("SELECT COUNT(*) AS n FROM prestamo");
    return {
      libros: cuenta("SELECT COUNT(*) AS n FROM libro"),
      usuarios: cuenta("SELECT COUNT(*) AS n FROM usuario"),
      ejemplares: {
        disponible: ejemplares.disponible ?? 0,
        prestado: ejemplares.prestado ?? 0,
        baja: ejemplares.baja ?? 0,
        total: cuenta("SELECT COUNT(*) AS n FROM ejemplar"),
      },
      prestamos: {
        activo: total - finalizados - vencidos,
        vencido: vencidos,
        finalizado: finalizados,
        total,
      },
      multasCobradas: (
        db
          .prepare("SELECT COALESCE(SUM(monto), 0) AS n FROM pago_multa")
          .get() as { n: number }
      ).n,
    };
  },

  masPrestados(limite = 10) {
    return db
      .prepare(
        `SELECT l.isbn, l.titulo, l.autor, COUNT(*) AS prestamos
           FROM prestamo p
           JOIN ejemplar e ON e.codigo_barras = p.id_ejemplar
           JOIN libro l ON l.isbn = e.isbn
          GROUP BY l.isbn
          ORDER BY prestamos DESC, l.titulo
          LIMIT ?`,
      )
      .all(limite);
  },

  porGenero() {
    return db
      .prepare(
        `SELECT l.genero, COUNT(*) AS prestamos
           FROM prestamo p
           JOIN ejemplar e ON e.codigo_barras = p.id_ejemplar
           JOIN libro l ON l.isbn = e.isbn
          GROUP BY l.genero
          ORDER BY prestamos DESC, l.genero`,
      )
      .all();
  },

  // Préstamos iniciados en cada uno de los últimos 6 meses (los meses sin préstamos figuran en 0)
  porMes() {
    const filas = db
      .prepare(
        `SELECT strftime('%Y-%m', fecha_inicio) AS mes, COUNT(*) AS prestamos
           FROM prestamo
          WHERE fecha_inicio >= date('now', 'start of month', '-5 months')
          GROUP BY mes`,
      )
      .all() as { mes: string; prestamos: number }[];
    const porMes = new Map(filas.map((f) => [f.mes, f.prestamos]));
    const hoy = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(
        Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth() - (5 - i), 1),
      );
      const mes = d.toISOString().slice(0, 7);
      return { mes, prestamos: porMes.get(mes) ?? 0 };
    });
  },
};

export const reporteRouter = Router();

// GET /reportes/resumen: todo lo que muestra la pantalla "Reportes"
reporteRouter.get("/resumen", (_req: Request, res: Response) => {
  res.json({
    generadoEn: new Date().toISOString().slice(0, 10),
    ...reporteRepository.resumen(),
    masPrestados: reporteRepository.masPrestados(),
    porGenero: reporteRepository.porGenero(),
    porMes: reporteRepository.porMes(),
  });
});
