import { ConflictError, NotFoundError } from "../../shared/errors.js";
import { ejemplarRepository } from "./ejemplar.repository";

export const ejemplarService = {
  listar: (paginacion) => ejemplarRepository.findAll(paginacion),

  obtener(codigo_barras) {
    const ejemplar = ejemplarRepository.findByCodigoBarras(codigo_barras);
    if (!ejemplar)
      throw new NotFoundError(
        `No existe el ejemplar con el codigo ${codigo_barras}`,
      );
    return ejemplar;
  },

  crear(ejemplar) {
    if (ejemplarRepository.findByCodigoBarras(ejemplar.codigo_barras))
      throw new ConflictError(
        `Ya existe un ejemplar con el codigo ${ejemplar.codigo_barras}`,
      );

    return ejemplarRepository.insert(ejemplar);
  },

  borrar(codigo_barras) {
    this.findByCodigoBarras(codigo_barras);
    return ejemplarRepository.deleteByCodigoBarras(codigo_barras);
  },

  actualizarEstado(codigo_barras, estado) {
    this.findByCodigoBarras(codigo_barras);
    return ejemplarRepository.updateEstado(codigo_barras, estado);
  },
};
