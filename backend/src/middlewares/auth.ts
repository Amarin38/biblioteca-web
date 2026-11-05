import type { NextFunction, Request, Response } from "express";
import type { UsuarioToken } from "../types/index.ts";
import { usuarioService } from "../features/usuarios/usuario.service.ts";
import { prestamoRepository } from "../features/prestamos/prestamo.repository.ts";
import { errores } from "../shared/errors.ts";

export async function usuarioDeRequest(
  req: Request,
): Promise<UsuarioToken | undefined> {
  const m = /^Bearer (.+)$/i.exec(req.get("authorization") ?? "");
  return m?.[1] ? usuarioService.usuarioDeToken(m[1]) : undefined;
}

export async function autenticar(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const usuario = await usuarioDeRequest(req);
  if (!usuario) throw errores.auth.sinSesion();

  res.locals.usuario = usuario;
  next();
}

export function soloAdmin(_req: Request, res: Response, next: NextFunction) {
  if (!(res.locals.usuario as UsuarioToken | undefined)?.admin)
    throw errores.auth.soloAdmin();

  next();
}

export async function adminParaModificar(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  await autenticar(req, res, () => soloAdmin(req, res, next));
}

export function prestamosPropios(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const u = res.locals.usuario as UsuarioToken;
  const m = /^\/(\d+)(\/|$)/.exec(req.path);

  if (m) {
    const prestamo = prestamoRepository.findByIdPrestamo(Number(m[1]));
    if (prestamo && prestamo.idUsuario !== u.id)
      throw errores.auth.prestamoAjeno();
  }

  if (req.method === "GET" && req.path === "/") {
    const enviar = res.json.bind(res);
    res.json = (cuerpo?: unknown) =>
      enviar(
        Array.isArray(cuerpo)
          ? cuerpo.filter(
              (p) => (p as { idUsuario?: number } | null)?.idUsuario === u.id,
            )
          : cuerpo,
      );
  }

  if (req.method === "POST" && req.path === "/") {
    const lista: unknown[] = Array.isArray(req.body) ? req.body : [req.body];
    if (
      lista.some(
        (x) =>
          Number((x as { idUsuario?: unknown } | null)?.idUsuario) !== u.id,
      )
    )
      throw errores.auth.prestamoAjeno();
  }

  next();
}

export function usuariosPropios(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const u = res.locals.usuario as UsuarioToken;
  const m = /^\/(\d+)(\/|$)/.exec(req.path);

  if (!m || Number(m[1]) !== u.id) throw errores.auth.usuarioAjeno();

  next();
}
