import { type Request, type Response } from "express";
import { prestamoService } from "./prestamo.service.ts";
import { type Estado, type FiltrosPrestamo } from "./prestamo.schema.ts";

type ReqId = Request<{ idPrestamo: number }>;
type ReqIdUsuario = Request<{ idUsuario: number }>;
type ReqIdEstado = Request<{ idPrestamo: number; estado: Estado }>;

export const prestamoController = {
  listar(req: Request, res: Response) {
    res.json(prestamoService.listar(req.valid.query as FiltrosPrestamo));
  },

  obtener(req: ReqId, res: Response) {
    const { idPrestamo } = req.valid.params as { idPrestamo: number };
    res.json(prestamoService.obtener(idPrestamo));
  },

  obtenerPorUsuario(req: ReqIdUsuario, res: Response) {
    const { idUsuario } = req.valid.params as { idUsuario: number };
    res.json(prestamoService.obtenerPorUsuario(idUsuario));
  },

  crear(req: Request, res: Response) {
    const creados = prestamoService.crear(req.valid.body);
    res.status(201).json(creados.length === 1 ? creados[0] : creados);
  },

  borrar(req: ReqId, res: Response) {
    const { idPrestamo } = req.valid.params as { idPrestamo: number };
    prestamoService.borrar(idPrestamo);
    res.status(204).end();
  },

  actualizarEstado(req: ReqIdEstado, res: Response) {
    res.json(
      prestamoService.actualizarEstado(req.params.idPrestamo, req.body.estado),
    );
  },

  multa(req: Request, res: Response): void {
    const { idPrestamo } = req.valid.params as { idPrestamo: number };
    res.json(prestamoService.obtenerMulta(idPrestamo));
  },

  devolver(req: Request, res: Response): void {
    const { idPrestamo } = req.valid.params as { idPrestamo: number };
    res.json(prestamoService.devolver(idPrestamo));
  },

  pagar(req: Request, res: Response): void {
    const { idPrestamo } = req.valid.params as { idPrestamo: number };
    const { monto } = req.valid.body as { monto: number };
    res.status(201).json(prestamoService.pagarMulta(idPrestamo, monto));
  },

  renovar(req: Request, res: Response): void {
    const { idPrestamo } = req.valid.params as { idPrestamo: number };
    res.status(201).json(prestamoService.renovarPrestamo(idPrestamo));
  },
};
