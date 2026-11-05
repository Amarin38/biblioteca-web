import { transaccion } from "../../config/db.ts";
import { ejemplarRepository } from "../ejemplares/ejemplar.repository.ts";
import { ejemplarService } from "../ejemplares/ejemplar.service.ts";
import { type Tipo } from "../usuarios/usuario.schema.ts";
import { usuarioService } from "../usuarios/usuario.service.ts";
import { prestamoRepository } from "./prestamo.repository.ts";
import type {
  PrestamoNuevo,
  FiltrosPrestamo,
  Prestamo,
} from "../../types/index.ts";
import { errores } from "../../shared/errors.ts";

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

  obtener(idPrestamo: number): Prestamo {
    const prestamo = prestamoRepository.findByIdPrestamo(idPrestamo);
    if (!prestamo) throw errores.prestamo.noExiste(idPrestamo);

    return prestamo;
  },

  obtenerPorUsuario(idUsuario: number): Prestamo[] {
    usuarioService.obtener(idUsuario);
    return prestamoRepository.findByIdUsuario(idUsuario);
  },

  crear: transaccion((prestamos: PrestamoNuevo[]) => {
    const creados: Prestamo[] = [];

    for (const { idUsuario, idEjemplar } of prestamos) {
      const usuario = usuarioService.obtener(idUsuario);
      const ejemplar = ejemplarService.obtener(idEjemplar);

      if (ejemplar.estado !== "disponible")
        throw errores.prestamo.noDisponible(idEjemplar, ejemplar.estado);

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

  borrar: transaccion((idPrestamo: number): number => {
    const prestamo = prestamoService.obtener(idPrestamo);
    if (prestamo.estado !== "finalizado")
      throw errores.prestamo.activo(idPrestamo);

    prestamoRepository.deletePagos(idPrestamo);
    return prestamoRepository.deleteByIdPrestamo(idPrestamo);
  }),

  actualizarEstado(idPrestamo: number, estado: Estado) {
    this.obtener(idPrestamo);
    return prestamoRepository.updateEstado(idPrestamo, estado);
  },

  // pago multa
  obtenerMulta(idPrestamo: number) {
    this.obtener(idPrestamo);
    const { diasAtraso, pagado } = prestamoRepository.calcularMulta(idPrestamo);
    const monto = diasAtraso * MULTA_POR_DIA;
    return { diasAtraso, monto, pagado, saldo: monto - pagado };
  },

  listarPagos(id_prestamo: number) {
    this.obtener(id_prestamo);
    return prestamoRepository.findPagos(id_prestamo);
  },

  devolver: transaccion((idPrestamo: number) => {
    const prestamo = prestamoService.obtener(idPrestamo);
    if (prestamo.estado === "finalizado") throw errores.prestamo.yaDevuelto();

    prestamoRepository.finalizarPrestamo(idPrestamo);
    ejemplarRepository.updateEstado(prestamo.idEjemplar, "disponible");

    return {
      ...prestamoService.obtener(idPrestamo),
      multa: prestamoService.obtenerMulta(idPrestamo),
    };
  }),

  pagarMulta(idPrestamo: number, monto: number) {
    const { saldo } = this.obtenerMulta(idPrestamo);
    if (saldo <= 0) throw errores.prestamo.sinMulta();
    if (monto > saldo) throw errores.prestamo.montoExcedeSaldo();

    prestamoRepository.insertPago(idPrestamo, monto);
    return this.obtenerMulta(idPrestamo);
  },

  renovarPrestamo(idPrestamo: number) {
    const prestamo = this.obtener(idPrestamo);
    if (prestamo.estado !== "activo") throw errores.prestamo.noActivo();
    if (prestamo.renovaciones >= MAX_RENOVACIONES)
      throw errores.prestamo.limite();
    if (this.obtenerMulta(idPrestamo).diasAtraso > 0)
      throw errores.prestamo.noRenovable();

    prestamoRepository.renovarPrestamo(idPrestamo, DIAS_RENOVACION);
    return this.obtener(idPrestamo);
  },
};
