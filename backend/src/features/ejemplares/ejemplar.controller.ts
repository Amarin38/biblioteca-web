import type { Request, Response } from "express";
import { ejemplarService } from "./ejemplar.service.ts";
import type {
  EjemplarNuevo,
  FiltrosEjemplar,
  ReqEjemplar,
  ReqLibro,
} from "../../types/index.ts";

import { ok, creado, sinContenido } from "../../shared/respuestas.ts";
import type { CambioEstado } from "./ejemplar.schema.ts";

export const ejemplarController = {
  listar(req: Request, res: Response) {
    ok(res, ejemplarService.listar(req.valid.query as FiltrosEjemplar));
  },

  obtener(req: ReqEjemplar, res: Response) {
    ok(res, ejemplarService.obtener(req.params.codigoBarras));
  },

  obtenerPorIsbn(req: ReqLibro, res: Response) {
    const { isbn } = req.valid.params as { isbn: string };
    ok(res, ejemplarService.obtenerPorIsbn(isbn));
  },

  crear(req: Request, res: Response): void {
    const { isbn } = req.valid.params as { isbn: string };
    const creados = ejemplarService.crear(
      isbn,
      req.valid.body as EjemplarNuevo[],
    );

    creado(
      res,
      creados.length === 1 ? creados[0] : creados,
      `/api/ejemplares/${creados[0].codigoBarras}`,
    );
  },

  borrar(req: ReqEjemplar, res: Response) {
    ejemplarService.borrar(req.params.codigoBarras);
    sinContenido(res);
  },

  actualizarEstado(req: ReqEjemplar<CambioEstado>, res: Response) {
    ok(
      res,
      ejemplarService.actualizarEstado(
        req.params.codigoBarras,
        req.body.estado,
      ),
    );
  },
};
