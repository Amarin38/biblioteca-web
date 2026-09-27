import { ConflictError, NotFoundError } from "../../shared/errors.js";
import { prestamoRepository } from "../prestamos/prestamo.repository.js";
import { usuarioRepository } from "../usuarios/usuario.repository.js";

export const usuarioService = {
  listar: (paginacion) => usuarioRepository.findAll(paginacion),

  obtener(id_usuario) {
    const usuario = usuarioRepository.findByIdUsuario(id_usuario);
    if (!usuario) throw new NotFoundError(`No existe el usuario ${id_usuario}`);

    return usuario;
  },

  crear(datos) {
    if (usuarioRepository.findByEmail(datos.email))
      throw new ConflictError(`El email ${datos.email}, ya está registrado`);

    return usuarioRepository.insert(datos);
  },

  borrar(id_usuario) {
    this.obtener(id_usuario);

    if (prestamoRepository.countActiveByUser(id_usuario) > 0) {
      throw new ConflictError(
        `El usuario ${usuario.nombre} tiene préstamos activos.`,
      );
    }

    return usuarioRepository.deleteByIdUsuario(id_usuario);
  },

  actualizarTipo(id_usuario, tipo) {
    this.obtener(id_usuario);
    return usuarioRepository.updateTipo(id_usuario, tipo);
  },
};
