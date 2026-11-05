import { z } from "zod";
import { TipoUsuarioEnum } from "../../config/constants.ts";

const idUsuario = z.coerce.number().int().positive();
const nombre = z.string().min(1);
const email = z.string().min(1);
const emailValido = z.email();
const emailSchema = z.string().trim().toLowerCase().email().max(120);
const tipo = z.enum(Object.values(TipoUsuarioEnum));
const limit = z.coerce.number().int().min(1).max(200).default(50);
const offset = z.coerce.number().int().min(0).default(0);

export const usuarioIdUsuarioSchema = z.object({ idUsuario }).strict();

export const usuarioSchema = z
  .object({
    idUsuario: idUsuario,
    nombre: nombre,
    email: emailValido,
    tipo: tipo,
  })
  .strict();

export const usuarioNuevoSchema = z
  .object({
    nombre: nombre,
    email: emailValido,
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

export const registroSchema = z
  .object({
    nombre: z.string().trim().min(1).max(100),
    email: emailSchema,
    password: z.string().min(8).max(128),
  })
  .strict();

export const loginSchema = z
  .object({ email: emailSchema, password: z.string().min(1).max(128) })
  .strict();

// types
export type Usuario = z.infer<typeof usuarioSchema>;
export type UsuarioNuevo = z.infer<typeof usuarioNuevoSchema>;
export type FiltrosUsuario = z.infer<typeof usuarioFiltrosSchema>;
export type Tipo = z.infer<typeof tipo>;
export type Registro = z.infer<typeof registroSchema>;
