import { z } from "zod";
import { EstadoPrestamoEnum } from "../../config/constants.ts";

const idAutoincrement = z.coerce.number().int().positive();
const idString = z.string().min(13).max(13);
const fecha = z.iso
  .date()
  .refine((f) => f <= new Date().toISOString().slice(0, 10), {
    message: "No puede ser futura o falsa.",
  });

const estado = z.enum(Object.values(EstadoPrestamoEnum));
const monto = z.number().positive();
const renovaciones = z.coerce.number().int().positive();
const limit = z.coerce.number().int().min(1).max(200).default(50);
const offset = z.coerce.number().int().min(0).default(0);

export const prestamoIdPrestamoSchema = z.object({ idAutoincrement }).strict();
export const prestamoEstadoSchema = z
  .object({ estado })
  .strict()
  .meta({ id: "PrestamoPatch" });

export const prestamoSchema = z
  .object({
    idPrestamo: idAutoincrement,
    idUsuario: idAutoincrement,
    idEjemplar: idString,
    fechaInicio: fecha,
    fechaVencimiento: fecha,
    fechaDevolucion: fecha,
    renovaciones: renovaciones,
    estado: estado,
  })
  .strict();

export const prestamoNuevoSchema = z
  .object({
    idUsuario: idAutoincrement,
    idEjemplar: idString,
  })
  .strict()
  .meta({ id: "Prestamo" });

export const prestamoInputSchema = z.union([
  prestamoNuevoSchema.transform((l) => [l]),
  z.array(prestamoNuevoSchema).min(1).max(100),
]);

export const prestamoFiltrosSchema = z.object({
  limit: limit,
  offset: offset,
  idEjemplar: idString.optional(),
  estado: estado.optional(),
});

export const prestamoPagoSchema = z.object({
  idPago: idAutoincrement,
  idPrestamo: idAutoincrement,
  monto: monto,
  fecha: fecha,
});

export const prestamoPagoNuevoSchema = z
  .object({
    idPrestamo: idAutoincrement,
    monto: monto,
    fecha: fecha,
  })
  .strict()
  .meta({ id: "PagoMulta" });

export const prestamoMultaSchema = z.object({});

//types
export type Prestamo = z.infer<typeof prestamoSchema>;
export type PrestamoNuevo = z.infer<typeof prestamoNuevoSchema>;
export type FiltrosPrestamo = z.infer<typeof prestamoFiltrosSchema>;
export type Estado = z.infer<typeof estado>;
export type Monto = z.infer<typeof monto>;

export type MultaFila = {
  diasAtraso: number;
  pagado: number;
};

export type Multa = MultaFila & {
  monto: typeof monto;
  saldo: number;
};

export type Pago = {
  idPago: typeof idAutoincrement;
  monto: typeof monto;
  fecha: typeof fecha;
};
