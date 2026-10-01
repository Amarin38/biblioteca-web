import { type Request, type Response } from "express";
import { libroService } from "./libro.service.ts";
import { type FiltrosLibro } from "./libro.schema.ts";

type ReqIsbn = Request<{ isbn: string }>;
type ReqIsbnTitulo = Request<{ isbn: string; titulo: string }>;

export const libroController = {
  listar(req: Request, res: Response) {
    res.json(libroService.listar(req.valid.query as FiltrosLibro));
  },

  obtener(req: ReqIsbn, res: Response) {
    res.json(libroService.obtener(req.params.isbn));
  },

  crear(req: Request, res: Response) {
    const creados = libroService.crear(req.body);
    res.status(201).json(creados.length === 1 ? creados[0] : creados);
  },

  borrar(req: ReqIsbn, res: Response) {
    libroService.borrar(req.params.isbn);
    res.status(204).end();
  },

  actualizarTitulo(req: ReqIsbnTitulo, res: Response) {
    res.json(libroService.actualizarTitulo(req.params.isbn, req.body.titulo));
  },
};
