import { type Request, type Response } from "express";
import { ejemplarService } from "./ejemplar.service.ts";
import {
  type EjemplarNuevo,
  type Estado,
  type FiltrosEjemplar,
} from "./ejemplar.schema.ts";

type ReqCodBarras = Request<{ codigoBarras: string }>;
type ReqCodBarrasEstado = Request<{ codigoBarras: string; estado: Estado }>;
type ReqIsbn = Request<{ isbn: string }>;

export const ejemplarController = {
  listar(req: Request, res: Response) {
    res.json(ejemplarService.listar(req.valid.query as FiltrosEjemplar));
  },

  obtener(req: ReqCodBarras, res: Response) {
    res.json(ejemplarService.obtener(req.params.codigoBarras));
  },

  obtenerPorIsbn(req: ReqIsbn, res: Response) {
    const { isbn } = req.valid.params as { isbn: string };
    res.json(ejemplarService.obtenerPorIsbn(isbn));
  },

  crear(req: Request, res: Response): void {
    const { isbn } = req.valid.params as { isbn: string };
    const creados = ejemplarService.crear(
      isbn,
      req.valid.body as EjemplarNuevo[],
    );
    res.status(201).json(creados.length === 1 ? creados[0] : creados);
  },

  borrar(req: ReqCodBarras, res: Response) {
    ejemplarService.borrar(req.params.codigoBarras);
    res.status(204).end();
  },

  actualizarEstado(req: ReqCodBarrasEstado, res: Response) {
    res.json(
      ejemplarService.actualizarEstado(
        req.params.codigoBarras,
        req.body.estado,
      ),
    );
  },
};
