import { ConflictError, NotFoundError } from "../../shared/errors.js";
import { prestamoRepository } from "./prestamo.repository.js";

export const prestamoService = {
  listar: (paginacion) => prestamoRepository.findAll(paginacion),

  obtenerPrestamo(id_prestamo) {
    const prestamo = prestamoRepository.findByIdPrestamo(id_prestamo);
    if (!prestamo)
      throw new NotFoundError(`No existe el prestamo ${id_prestamo}`);

    return prestamo;
  },

  obtenerPrestamosUsuario(id_usuario) {
    const prestamos = prestamoRepository.findByIdUsuario(id_usuario);
    if (!prestamos) throw new NotFoundError("El usuario no tiene prestamos.");

    return prestamos;
  },

  crear(datos) {
    if (prestamoRepository.findByIdPrestamo(datos.id_prestamo))
      throw new ConflictError(`El ID ${datos.id_prestamo}, ya está registrado`);

    return prestamoRepository.insert(prestamo);
  },

  borrar(id_prestamo) {
    this.obtenerPrestamo(id_prestamo);
    return prestamoRepository.deleteByIdPrestamo(id_prestamo);
  },

  actualizarEstado(id_prestamo, estado) {
    this.obtenerPrestamo(id_prestamo);
    return prestamoRepository.updateEstado(id_prestamo, estado);
  },
};
