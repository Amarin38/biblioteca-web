import { ConflictError, NotFoundError } from "../../shared/errors.js";
import { ejemplarRepository } from "../ejemplares/ejemplar.repository.js";
import { libroRepository } from "./libro.repository.js";

export const libroService = {
  listar: (paginacion) => libroRepository.findAll(paginacion),

  obtener(isbn) {
    const libro = libroRepository.findByIsbn(isbn);
    if (!libro)
      throw new NotFoundError(`No existe el libro con el isbn ${isbn}`);
    return libro;
  },

  crear(datos) {
    if (libroRepository.findByIsbn(isbn))
      throw new ConflictError(`Ya existe un libro con el isbn ${datos.isbn}`);

    return libroRepository.insert(libro);
  },

  borrar(isbn) {
    this.obtener(isbn);

    if (ejemplarRepository.countEjemplaresByIsbn(isbn) > 0) {
      throw new ConflictError(
        "No se puede eliminar un libro si sigue teniendo ejemplares.",
      );
    }

    return libroRepository.deleteByIsbn(isbn);
  },

  actualizarNombre(isbn, nombre) {
    this.obtener(isbn);

    return libroRepository.updateNombreByIsbn(isbn, nombre);
  },
};
