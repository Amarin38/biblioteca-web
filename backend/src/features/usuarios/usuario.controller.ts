import type { Request, Response } from "express";
import { usuarioService } from "./usuario.service.ts";
import type {
  FiltrosUsuario,
  UsuarioNuevo,
  ReqUsuario,
} from "../../types/index.ts";

import { z } from "zod";
import { registroSchema, loginSchema } from "./usuario.schema.ts";
import { errores } from "../../shared/errors.ts";
import { ok, creado, sinContenido } from "../../shared/respuestas.ts";

const errorDe = (e: z.ZodError) =>
  e.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");

export const usuarioController = {
  listar(req: Request, res: Response) {
    ok(res, usuarioService.listar(req.valid.query as FiltrosUsuario));
  },

  obtener(req: Request, res: Response) {
    const { idUsuario } = req.valid.params as { idUsuario: number };
    ok(res, usuarioService.obtener(idUsuario));
  },

  crear(req: Request, res: Response) {
    const creados = usuarioService.crear(req.valid.body as UsuarioNuevo[]);
    creado(
      res,
      creados.length === 1 ? creados[0] : creados,
      `/api/usuarios/${creados[0].idUsuario}`,
    );
  },

  borrar(req: Request, res: Response) {
    const { idUsuario } = req.valid.params as { idUsuario: number };
    usuarioService.borrar(idUsuario);
    sinContenido(res);
  },

  reemplazarUsuario(req: ReqUsuario, res: Response) {
    const { idUsuario } = req.valid.params as { idUsuario: number };
    ok(
      res,
      usuarioService.reemplazarUsuario(
        idUsuario,
        req.valid.body as UsuarioNuevo,
      ),
    );
  },

  async registrar(req: Request, res: Response) {
    const datos = registroSchema.safeParse(req.body);
    if (!datos.success) throw errores.general.validacion(errorDe(datos.error));

    const sesion = await usuarioService.registrar(datos.data);
    creado(res, sesion, `/usuarios/${sesion.usuario.idUsuario}`);
  },

  async login(req: Request, res: Response) {
    const datos = loginSchema.safeParse(req.body);
    if (!datos.success) throw errores.general.validacion(errorDe(datos.error));

    ok(
      res,
      await usuarioService.login(datos.data.email, datos.data.password, req.ip),
    );
  },
};
