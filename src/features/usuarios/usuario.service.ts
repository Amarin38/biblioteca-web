import { transaccion } from "../../config/db.ts";
import { ConflictError, NotFoundError } from "../../shared/errors.ts";
import { prestamoRepository } from "../prestamos/prestamo.repository.ts";
import { usuarioRepository } from "../usuarios/usuario.repository.ts";
import {
  type FiltrosUsuario,
  type Tipo,
  type Usuario,
  type UsuarioNuevo,
} from "./usuario.schema.ts";

export const usuarioService = {
  listar: (filtros: FiltrosUsuario) => usuarioRepository.findAll(filtros),

  obtener(id_usuario: number): Usuario {
    const usuario = usuarioRepository.findByIdUsuario(id_usuario);
    if (!usuario)
      throw new NotFoundError(`No existe el usuario con el id ${id_usuario}`);

    return usuario;
  },

  obtenerPorEmail(email: string): Usuario {
    const usuario = usuarioRepository.findByEmail(email);
    if (!usuario)
      throw new NotFoundError(`No existe el usuario con el email ${email}`);

    return usuario;
  },

  crear: transaccion((usuarios: UsuarioNuevo[]) => {
    const creados = [];

    for (const usuario of usuarios) {
      if (usuarioRepository.findByEmail(usuario.email))
        throw new ConflictError(
          `El email ${usuario.email}, ya está registrado`,
        );
      creados.push(usuarioRepository.insert({ ...usuario }));
    }

    return creados;
  }),

  borrar(id_usuario: number) {
    const usuario = this.obtener(id_usuario);

    if (prestamoRepository.countActiveByUser(id_usuario) > 0) {
      throw new ConflictError(
        `El usuario ${usuario.nombre} tiene préstamos activos y no puede ser eliminado.`,
      );
    }

    return usuarioRepository.deleteByIdUsuario(id_usuario);
  },

  reemplazarUsuario(id_usuario: number, datos: UsuarioNuevo) {
    this.obtener(id_usuario);

    const otro = this.obtenerPorEmail(datos.email);
    if (otro && otro.idUsuario !== id_usuario) {
      throw new ConflictError(`El email ${datos.email} ya está registrado`);
    }

    return usuarioRepository.update(id_usuario, datos);
  },
};
