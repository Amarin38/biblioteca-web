import type { Request, Response } from "express";
import type {
  Estado,
  FiltrosPrestamo,
  ReqPrestamo,
  ReqUsuario,
} from "../../types/index.ts";
import { prestamoService } from "./prestamo.service.ts";
import { ok, creado, sinContenido } from "../../shared/respuestas.ts";

export const prestamoController = {
  listar(req: Request, res: Response) {
    ok(res, prestamoService.listar(req.valid.query as FiltrosPrestamo));
  },

  obtener(req: ReqPrestamo, res: Response) {
    const { idPrestamo } = req.valid.params as { idPrestamo: number };
    ok(res, prestamoService.obtener(idPrestamo));
  },

  obtenerPorUsuario(req: ReqUsuario, res: Response) {
    const { idUsuario } = req.valid.params as { idUsuario: number };
    ok(res, prestamoService.obtenerPorUsuario(idUsuario));
  },

  crear(req: Request, res: Response) {
    const creados = prestamoService.crear(req.valid.body);
    creado(
      res,
      creados.length === 1 ? creados[0] : creados,
      `/api/prestamos/${creados[0].idPrestamo}`,
    );
  },

  borrar(req: ReqPrestamo, res: Response) {
    const { idPrestamo } = req.valid.params as { idPrestamo: number };
    prestamoService.borrar(idPrestamo);
    sinContenido(res);
  },

  actualizarEstado(req: Request, res: Response) {
    const { idPrestamo } = req.valid.params as { idPrestamo: number };
    const { estado } = req.valid.body as { estado: Estado };
    ok(res, prestamoService.actualizarEstado(idPrestamo, estado));
  },

  multa(req: Request, res: Response): void {
    const { idPrestamo } = req.valid.params as { idPrestamo: number };
    ok(res, prestamoService.obtenerMulta(idPrestamo));
  },

  pagos(req: Request, res: Response): void {
    const { idPrestamo } = req.valid.params as { idPrestamo: number };
    ok(res, prestamoService.listarPagos(idPrestamo));
  },

  devolver(req: Request, res: Response): void {
    const { idPrestamo } = req.valid.params as { idPrestamo: number };
    ok(res, prestamoService.devolver(idPrestamo));
  },

  pagar(req: Request, res: Response): void {
    const { idPrestamo } = req.valid.params as { idPrestamo: number };
    const { monto } = req.valid.body as { monto: number };
    creado(
      res,
      prestamoService.pagarMulta(idPrestamo, monto),
      `/api/prestamos/${idPrestamo}/multa/pagos`,
    );
  },

  renovar(req: Request, res: Response): void {
    const { idPrestamo } = req.valid.params as { idPrestamo: number };
    creado(
      res,
      prestamoService.renovarPrestamo(idPrestamo),
      `/api/prestamos/${idPrestamo}`,
    );
  },
};
