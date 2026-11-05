import type { Request, Response } from "express";
import { libroService } from "./libro.service.ts";
import type {
  CambiosLibro,
  FiltrosLibro,
  Libro,
  ReqLibro,
} from "../../types/index.ts";

import path from "node:path";
import { errores } from "../../shared/errors.ts";
import { ok, creado, sinContenido } from "../../shared/respuestas.ts";

export const libroController = {
  listar(req: Request, res: Response) {
    ok(res, libroService.listar(req.valid.query as FiltrosLibro));
  },

  obtener(req: ReqLibro, res: Response) {
    ok(res, libroService.obtener(req.params.isbn));
  },

  crear(req: Request, res: Response) {
    const creados = libroService.crear(req.valid.body as Libro[]);
    creado(
      res,
      creados.length === 1 ? creados[0] : creados,
      `/api/libros/${creados[0].isbn}`,
    );
  },

  borrar(req: ReqLibro, res: Response) {
    libroService.borrar(req.params.isbn);
    sinContenido(res);
  },

  actualizarTitulo(req: ReqLibro, res: Response) {
    ok(
      res,
      libroService.actualizarTitulo(req.params.isbn, req.body as CambiosLibro),
    );
  },

  servirPdf(
    isbn: string,
    res: Response,
    autenticado: boolean,
    permitido: boolean,
  ) {
    if (!autenticado) throw errores.auth.sinSesion();

    const libro = libroService.obtener(isbn);

    if (!permitido) throw errores.auth.sinPrestamoParaPdf();

    const archivo = libroService.buscarPdf(libro.titulo);

    if (!archivo) throw errores.libro.sinPdf(libro.titulo);

    res.type("application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename*=UTF-8''${encodeURIComponent(path.basename(archivo))}`,
    );
    res.sendFile(archivo);
  },
};
