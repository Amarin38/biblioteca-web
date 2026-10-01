import { z } from "zod";
import { EstadoEjemplarEnum } from "../../config/constants.ts";

const codigoBarras = z.string().max(13).min(13);
const isbn = z.string().min(10);
const estado = z.enum(Object.values(EstadoEjemplarEnum));
const limit = z.coerce.number().int().min(1).max(200).default(50);
const offset = z.coerce.number().int().min(0).default(0);

export const ejemplarEstadoSchema = z.object({ estado }).strict();
export const ejemplarCodigoBarrasSchema = z
  .object({ codigoBarras })
  .strict()
  .meta({ id: "EjemplarPatch" });

export const ejemplarSchema = z
  .object({
    codigoBarras: codigoBarras,
    isbn: isbn,
    estado: estado,
  })
  .strict();

export const ejemplarNuevoSchema = z
  .object({
    codigoBarras: codigoBarras,
  })
  .strict()
  .meta({ id: "Ejemplar" });

export const ejemplarInputSchema = z.union([
  ejemplarNuevoSchema.transform((l) => [l]),
  z.array(ejemplarNuevoSchema).min(1).max(100),
]);

export const ejemplarFiltrosSchema = z.object({
  limit: limit,
  offset: offset,
  estado: estado.optional(),
});

// types
export type Ejemplar = z.infer<typeof ejemplarSchema>;
export type EjemplarNuevo = z.infer<typeof ejemplarNuevoSchema>;
export type FiltrosEjemplar = z.infer<typeof ejemplarFiltrosSchema>;
export type Estado = z.infer<typeof estado>;
