import { transaccion } from "../../config/db.ts";
import { libroService } from "../libros/libro.service.ts";
import { ejemplarRepository } from "./ejemplar.repository.ts";
import type {
  FiltrosEjemplar,
  Ejemplar,
  EstadoEjemplar,
  EjemplarNuevo,
} from "../../types/index.ts";
import { errores } from "../../shared/errors.ts";

export const ejemplarService = {
  listar: (filtros: FiltrosEjemplar) => ejemplarRepository.findAll(filtros),

  obtener(codigo_barras: string) {
    const ejemplar = ejemplarRepository.findByCodigoBarras(codigo_barras);
    if (!ejemplar) throw errores.ejemplar.noExiste(codigo_barras);

    return ejemplar;
  },

  // 404 si el libro no existe; un libro sin ejemplares devuelve una lista vacía
  obtenerPorIsbn(isbn: string) {
    libroService.obtener(isbn);
    return ejemplarRepository.findByIsbn(isbn);
  },

  crear: transaccion((isbn: string, ejemplares: EjemplarNuevo[]) => {
    libroService.obtener(isbn);

    const creados: Ejemplar[] = [];
    for (const ejemplar of ejemplares) {
      if (ejemplarRepository.findByCodigoBarras(ejemplar.codigoBarras))
        throw errores.ejemplar.yaExiste(ejemplar.codigoBarras);

      creados.push(
        ejemplarRepository.insert({ ...ejemplar, isbn, estado: "disponible" }),
      );
    }

    return creados;
  }),

  // Con préstamos registrados solo se elimina si está dado de baja, y se lleva su historial; con uno activo, nunca
  borrar: transaccion((codigo_barras: string) => {
    const ejemplar = ejemplarService.obtener(codigo_barras);
    if (ejemplarRepository.countPrestamosActivos(codigo_barras) > 0)
      throw errores.ejemplar.conPrestamoActivo(codigo_barras);

    if (ejemplarRepository.countPrestamos(codigo_barras) > 0) {
      if (ejemplar.estado !== "baja")
        throw errores.ejemplar.noSePuedeDarDeBaja(codigo_barras);

      ejemplarRepository.deletePrestamos(codigo_barras);
    }
    return ejemplarRepository.deleteByCodigoBarras(codigo_barras);
  }),

  actualizarEstado(codigo_barras: string, estado: EstadoEjemplar) {
    this.obtener(codigo_barras);
    return ejemplarRepository.updateEstado(codigo_barras, estado);
  },
};
