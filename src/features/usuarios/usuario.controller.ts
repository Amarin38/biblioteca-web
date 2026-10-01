import { type Request, type Response } from "express";
import { usuarioService } from "./usuario.service.ts";
import {
  type FiltrosUsuario,
  type Tipo,
  type UsuarioNuevo,
} from "./usuario.schema.ts";

type ReqId = Request<{ idUsuario: number }>;
type ReqUsuario = Request<{
  nombre: string;
  email: string;
  tipo: Tipo;
}>;

export const usuarioController = {
  listar(req: Request, res: Response) {
    res.json(usuarioService.listar(req.valid.query as FiltrosUsuario));
  },

  obtener(req: ReqId, res: Response) {
    res.json(usuarioService.obtener(req.params.idUsuario));
  },

  crear(req: Request, res: Response) {
    const creados = usuarioService.crear(req.body);
    res.status(201).json(creados.length === 1 ? creados[0] : creados);
  },

  borrar(req: ReqId, res: Response) {
    usuarioService.borrar(req.params.idUsuario);
    res.status(204).end();
  },

  reemplazarUsuario(req: ReqUsuario, res: Response) {
    const { idUsuario } = req.valid.params as { idUsuario: number };
    res.json(
      usuarioService.reemplazarUsuario(
        idUsuario,
        req.valid.body as UsuarioNuevo,
      ),
    );
  },
};
