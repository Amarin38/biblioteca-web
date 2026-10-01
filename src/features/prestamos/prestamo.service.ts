import { transaccion } from "../../config/db.ts";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from "../../shared/errors.ts";
import { ejemplarRepository } from "../ejemplares/ejemplar.repository.ts";
import { ejemplarService } from "../ejemplares/ejemplar.service.ts";
import { type Tipo } from "../usuarios/usuario.schema.ts";
import { usuarioService } from "../usuarios/usuario.service.ts";
import { prestamoRepository } from "./prestamo.repository.ts";
import {
  type PrestamoNuevo,
  type Estado,
  type FiltrosPrestamo,
  type Prestamo,
} from "./prestamo.schema.ts";

const MAX_RENOVACIONES = 2;
const DIAS_RENOVACION = 7;
const MULTA_POR_DIA = 50;
const DIAS_PLAZO: Record<Tipo, number> = {
  docente: 30,
  socio: 21,
  normal: 14,
} as const;

export const prestamoService = {
  listar: (filtros: FiltrosPrestamo) => prestamoRepository.findAll(filtros),

  obtener(id_prestamo: number): Prestamo {
    const prestamo = prestamoRepository.findByIdPrestamo(id_prestamo);
    if (!prestamo)
      throw new NotFoundError(`No existe el prestamo ${id_prestamo}`);

    return prestamo;
  },

  obtenerPorUsuario(id_usuario: number): Prestamo[] {
    const prestamos = prestamoRepository.findByIdUsuario(id_usuario);
    if (!prestamos) throw new NotFoundError("El usuario no tiene prestamos.");

    return prestamos;
  },

  crear: transaccion((prestamos: PrestamoNuevo[]) => {
    const creados: Prestamo[] = [];

    for (const { idUsuario, idEjemplar } of prestamos) {
      const usuario = usuarioService.obtener(idUsuario);
      const ejemplar = ejemplarService.obtener(idEjemplar);

      if (ejemplar.estado !== "disponible") {
        throw new ConflictError(
          `El ejemplar ${idEjemplar} está ${ejemplar.estado}`,
        );
      }

      ejemplarService.actualizarEstado(idEjemplar, "prestado");
      creados.push(
        prestamoRepository.insert(
          idUsuario,
          idEjemplar,
          DIAS_PLAZO[usuario.tipo],
        ),
      );
    }

    return creados;
  }),

  borrar(id_prestamo: number): number {
    this.obtener(id_prestamo);
    return prestamoRepository.deleteByIdPrestamo(id_prestamo);
  },

  actualizarEstado(id_prestamo: number, estado: Estado) {
    this.obtener(id_prestamo);
    return prestamoRepository.updateEstado(id_prestamo, estado);
  },

  // pago multa
  obtenerMulta(idPrestamo: number) {
    this.obtener(idPrestamo);
    const { diasAtraso, pagado } = prestamoRepository.calcularMulta(idPrestamo);
    const monto = diasAtraso * MULTA_POR_DIA;
    return { diasAtraso, monto, pagado, saldo: monto - pagado };
  },

  devolver: transaccion((idPrestamo: number) => {
    const prestamo = prestamoService.obtener(idPrestamo);
    if (prestamo.estado === "finalizado")
      throw new ConflictError("El préstamo ya fue devuelto");

    prestamoRepository.finalizarPrestamo(idPrestamo);
    ejemplarRepository.updateEstado(prestamo.idEjemplar, "disponible");

    return {
      ...prestamoService.obtener(idPrestamo),
      multa: prestamoService.obtenerMulta(idPrestamo),
    };
  }),

  pagarMulta(idPrestamo: number, monto: number) {
    const { saldo } = this.obtenerMulta(idPrestamo);
    if (saldo <= 0)
      throw new ConflictError("El préstamo no tiene multa pendiente");
    if (monto > saldo)
      throw new BadRequestError("El monto supera el saldo (${saldo})");

    prestamoRepository.insertPago(idPrestamo, monto);
    return this.obtenerMulta(idPrestamo);
  },

  renovarPrestamo(idPrestamo: number) {
    const prestamo = this.obtener(idPrestamo);
    if (prestamo.estado !== "activo")
      throw new ConflictError("Solo se renuevan préstamos activos");
    if (prestamo.renovaciones >= MAX_RENOVACIONES)
      throw new ConflictError("Límite de renovaciones alcanzado");
    if (this.obtenerMulta(idPrestamo).diasAtraso > 0)
      throw new ConflictError("No se puede renovar un préstamo vencido");

    prestamoRepository.renovarPrestamo(idPrestamo, DIAS_RENOVACION);
    return this.obtener(idPrestamo);
  },
};
