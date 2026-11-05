import type { Request } from "express";
import type { Ejemplar } from "../features/ejemplares/ejemplar.schema.ts";

export type {
  Libro,
  FiltrosLibro,
  Genero,
  CambiosLibro,
} from "../features/libros/libro.schema.ts";

export type {
  Usuario,
  UsuarioNuevo,
  FiltrosUsuario,
  Registro,
  Tipo,
} from "../features/usuarios/usuario.schema.ts";

export type {
  Ejemplar,
  FiltrosEjemplar,
  EjemplarNuevo,
  EstadoEjemplar,
} from "../features/ejemplares/ejemplar.schema.ts";

export type {
  Prestamo,
  PrestamoNuevo,
  FiltrosPrestamo,
  Monto,
  Multa,
} from "../features/prestamos/prestamo.schema.ts";

// Tipos escritos a mano
export interface UsuarioToken {
  id: number;
  nombre: string;
  email: string;
  tipo: string;
  admin: boolean;
}

export interface FilaAuth {
  id_usuario: number;
  nombre: string;
  email: string;
  tipo: string;
  es_admin: number;
  password_hash: string | null;
}

type Req<P, B = unknown> = Request<P, unknown, B>;

export type ReqLibro<B = unknown> = Req<{ isbn: string }, B>;
export type ReqEjemplar<B = unknown> = Req<{ codigoBarras: string }, B>;
export type ReqUsuario<B = unknown> = Req<{ idUsuario: string }, B>;
export type ReqPrestamo<B = unknown> = Req<{ idPrestamo: string }, B>;
