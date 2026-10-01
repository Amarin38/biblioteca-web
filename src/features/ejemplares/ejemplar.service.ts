import { transaccion } from "../../config/db.ts";
import { ConflictError, NotFoundError } from "../../shared/errors.ts";
import { libroService } from "../libros/libro.service.ts";
import { ejemplarRepository } from "./ejemplar.repository.ts";
import {
  type FiltrosEjemplar,
  type Ejemplar,
  type Estado,
  type EjemplarNuevo,
} from "./ejemplar.schema.ts";

export const ejemplarService = {
  listar: (filtros: FiltrosEjemplar) => ejemplarRepository.findAll(filtros),

  obtener(codigo_barras: string) {
    const ejemplar = ejemplarRepository.findByCodigoBarras(codigo_barras);
    if (!ejemplar)
      throw new NotFoundError(
        `No existe el ejemplar con el codigo ${codigo_barras}`,
      );
    return ejemplar;
  },

  obtenerPorIsbn(isbn: string) {
    const ejemplar = ejemplarRepository.findByIsbn(isbn);
    if (!ejemplar)
      throw new NotFoundError(`No existen ejemplares para el isbn ${isbn}`);
    return ejemplar;
  },

  crear: transaccion((isbn: string, ejemplares: EjemplarNuevo[]) => {
    libroService.obtener(isbn);

    const creados: Ejemplar[] = [];
    for (const ejemplar of ejemplares) {
      if (ejemplarRepository.findByCodigoBarras(ejemplar.codigoBarras))
        throw new ConflictError(
          `Ya existe un ejemplar con el codigo ${ejemplar.codigoBarras}`,
        );
      creados.push(ejemplarRepository.insert({ ...ejemplar, isbn }));
    }

    return creados;
  }),

  borrar(codigo_barras: string) {
    this.obtener(codigo_barras);
    return ejemplarRepository.deleteByCodigoBarras(codigo_barras);
  },

  actualizarEstado(codigo_barras: string, estado: Estado) {
    this.obtener(codigo_barras);
    return ejemplarRepository.updateEstado(codigo_barras, estado);
  },
};
