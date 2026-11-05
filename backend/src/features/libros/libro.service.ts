import fs from "node:fs";
import path from "node:path";
import { transaccion } from "../../config/db.ts";
import { ejemplarRepository } from "../ejemplares/ejemplar.repository.ts";
import { libroRepository } from "./libro.repository.ts";
import type { CambiosLibro, FiltrosLibro, Libro } from "../../types/index.ts";
import { errores } from "../../shared/errors.ts";

const PDF_DIR = path.resolve(process.env.PDF_DIR ?? "pdfs");
const clave = (texto: string) =>
  texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\\/:*?"<>|]/g, "")
    .trim()
    .toLowerCase();

export const libroService = {
  listar: (filtros: FiltrosLibro) => libroRepository.findAll(filtros),

  obtener(isbn: string): Libro {
    const libro = libroRepository.findByIsbn(isbn);
    if (!libro) throw errores.libro.noExiste(isbn);
    return libro;
  },

  crear: transaccion((libros: Libro[]) => {
    const creados = [];

    for (const libro of libros) {
      if (libroRepository.findByIsbn(libro.isbn))
        throw errores.libro.yaExiste(libro.isbn);
      creados.push(libroRepository.insert(libro));
    }
    return creados;
  }),

  borrar(isbn: string) {
    const libro = this.obtener(isbn);

    if (ejemplarRepository.countEjemplaresByIsbn(isbn) > 0)
      throw errores.libro.conEjemplares(isbn, libro.titulo);

    return libroRepository.deleteByIsbn(isbn);
  },

  actualizarTitulo(isbn: string, cambios: CambiosLibro) {
    if (cambios.titulo === undefined && cambios.sinopsis === undefined)
      throw errores.libro.sinCambios();
    this.obtener(isbn);
    return libroRepository.updateByIsbn(isbn, {
      titulo: cambios.titulo?.trim(),
      sinopsis: cambios.sinopsis?.trim(),
    });
  },

  buscarPdf(titulo: string): string | undefined {
    let archivos: string[];
    try {
      archivos = fs.readdirSync(PDF_DIR);
    } catch {
      return undefined;
    }
    const buscado = clave(titulo);
    const nombre = archivos.find(
      (f) =>
        f.toLowerCase().endsWith(".pdf") && clave(f.slice(0, -4)) === buscado,
    );

    return nombre ? path.join(PDF_DIR, nombre) : undefined;
  },
};
