import { transaccion } from "../../config/db.ts";
import {
  ConflictError,
  NotFoundError,
  BadRequestError,
} from "../../shared/errors.ts";
import { ejemplarRepository } from "../ejemplares/ejemplar.repository.ts";
import { libroRepository } from "./libro.repository.ts";
import { type FiltrosLibro, type Libro } from "./libro.schema.ts";

export const libroService = {
  listar: (filtros: FiltrosLibro) => libroRepository.findAll(filtros),

  obtener(isbn: string): Libro {
    const libro = libroRepository.findByIsbn(isbn);
    if (!libro)
      throw new NotFoundError(`No existe el libro con el isbn ${isbn}`);
    return libro;
  },

  crear: transaccion((libros: Libro[]) => {
    const creados = [];

    for (const libro of libros) {
      if (libroRepository.findByIsbn(libro.isbn))
        throw new ConflictError(`Ya existe un libro con el isbn ${libro.isbn}`);
      creados.push(libroRepository.insert(libro));
    }
    return creados;
  }),

  borrar(isbn: string) {
    const libro = this.obtener(isbn);

    if (ejemplarRepository.countEjemplaresByIsbn(isbn) > 0) {
      throw new ConflictError(
        `No se puede eliminar el libro (${isbn}) ${libro.titulo}, ya que sigue teniendo ejemplares.`,
      );
    }

    return libroRepository.deleteByIsbn(isbn);
  },

  actualizarTitulo(isbn: string, titulo: string) {
    this.obtener(isbn);
    return libroRepository.updateTituloByIsbn(isbn, titulo.trim());
  },
};
