import { z } from "zod";

export const errorSchema = z
  .object({
    error: z.string().meta({ example: "Libro inexistente" }),
    detalles: z
      .array(
        z.object({
          campo: z.string().meta({ example: "isbn" }),
          mensaje: z.string().meta({ example: "Requerido" }),
        }),
      )
      .optional(),
  })
  .meta({ id: "Error" });

export type ErrorResponse = z.infer<typeof errorSchema>;
