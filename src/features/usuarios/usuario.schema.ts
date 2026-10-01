import { z } from "zod";
import { TipoUsuarioEnum } from "../../config/constants.ts";

const idUsuario = z.number().int().positive();
const nombre = z.string().min(1);
const email = z.string().min(1);
const tipo = z.enum(Object.values(TipoUsuarioEnum));
const limit = z.coerce.number().int().min(1).max(200).default(50);
const offset = z.coerce.number().int().min(0).default(0);

export const usuarioIdUsuarioSchema = z.object({ idUsuario }).strict();

export const usuarioSchema = z
  .object({
    idUsuario: idUsuario,
    nombre: nombre,
    email: email,
    tipo: tipo,
  })
  .strict();

export const usuarioNuevoSchema = z
  .object({
    nombre: nombre,
    email: email,
    tipo: tipo,
  })
  .strict()
  .meta({ id: "Usuario" });

export const usuarioInputSchema = z.union([
  usuarioNuevoSchema.transform((l) => [l]),
  z.array(usuarioNuevoSchema).min(1).max(100),
]);

export const usuarioFiltrosSchema = z.object({
  limit: limit,
  offset: offset,
  nombre: nombre.optional(),
  email: email.optional(),
  tipo: tipo.optional(),
});

// types
export type Usuario = z.infer<typeof usuarioSchema>;
export type UsuarioNuevo = z.infer<typeof usuarioNuevoSchema>;
export type FiltrosUsuario = z.infer<typeof usuarioFiltrosSchema>;
export type Tipo = z.infer<typeof tipo>;
