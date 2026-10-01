import { z } from "zod";
import { GeneroLibroEnum } from "../../config/constants.ts";

const isbn = z.string().min(10);
const titulo = z.string().min(1).optional();
const autor = z.string().min(1).optional();
const genero = z.enum(Object.values(GeneroLibroEnum)).optional();
const limit = z.coerce.number().int().min(1).max(200).default(50);
const offset = z.coerce.number().int().min(0).default(0);
const fechaLanzamiento = z.iso
  .date()
  .refine((f) => f <= new Date().toISOString().slice(0, 10), {
    message: "No puede ser futura o falsa.",
  });

export const libroIsbnSchema = z.object({ isbn }).strict();
export const libroTituloSchema = z
  .object({ titulo })
  .strict()
  .meta({ id: "LibroPatch" });

export const libroNuevoSchema = z
  .object({
    isbn: isbn,
    titulo: titulo,
    autor: autor,
    genero: genero,
    fechaLanzamiento: fechaLanzamiento,
  })
  .strict()
  .meta({ id: "Libro" });

export const libroInputSchema = z.union([
  libroNuevoSchema.transform((l) => [l]),
  z.array(libroNuevoSchema).min(1).max(100),
]);

export const libroFiltrosSchema = z.object({
  limit: limit,
  offset: offset,
  titulo: titulo,
  autor: autor,
  genero: genero,
});

// types
export type Libro = z.infer<typeof libroNuevoSchema>;
export type FiltrosLibro = z.infer<typeof libroFiltrosSchema>;
export type Genero = z.infer<typeof genero>;
