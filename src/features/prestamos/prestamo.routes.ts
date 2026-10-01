import { Router } from "express";
import { prestamoController } from "./prestamo.controller.ts";
import { validate } from "../../middlewares/validate.ts";
import {
  prestamoFiltrosSchema,
  prestamoIdPrestamoSchema,
  prestamoInputSchema,
  prestamoNuevoSchema,
  prestamoPagoSchema,
} from "./prestamo.schema.ts";

const prestamoRoutes = Router();

prestamoRoutes.get(
  "/",
  validate(prestamoFiltrosSchema, "query"),
  prestamoController.listar,
);

prestamoRoutes.get(
  "/:idPrestamo",
  validate(prestamoIdPrestamoSchema, "params"),
  prestamoController.obtener,
);

prestamoRoutes.post(
  "/",
  validate(prestamoInputSchema),
  prestamoController.crear,
);

prestamoRoutes.delete(
  "/:idPrestamo",
  validate(prestamoIdPrestamoSchema, "params"),
  prestamoController.borrar,
);

prestamoRoutes.patch(
  "/:idPrestamo",
  validate(prestamoIdPrestamoSchema, "params"),
  validate(prestamoNuevoSchema),
  prestamoController.actualizarEstado,
);

prestamoRoutes.get(
  "/:idPrestamo/multa",
  validate(prestamoIdPrestamoSchema, "params"),
  prestamoController.multa,
);

prestamoRoutes.post(
  "/:idPrestamo/devolucion",
  validate(prestamoIdPrestamoSchema, "params"),
  prestamoController.devolver,
);

prestamoRoutes.post(
  "/:idPrestamo/multa/pagos",
  validate(prestamoIdPrestamoSchema, "params"),
  validate(prestamoPagoSchema),
  prestamoController.pagar,
);

prestamoRoutes.post(
  "/:idPrestamo/renovaciones",
  validate(prestamoIdPrestamoSchema, "params"),
  prestamoController.renovar,
);

export default prestamoRoutes;
