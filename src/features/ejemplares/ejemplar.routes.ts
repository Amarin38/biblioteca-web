import { Router } from "express";
import { ejemplarController } from "./ejemplar.controller.ts";
import { validate } from "../../middlewares/validate.ts";
import {
  ejemplarCodigoBarrasSchema,
  ejemplarEstadoSchema,
  ejemplarFiltrosSchema,
} from "./ejemplar.schema.ts";

const ejemplarRoutes = Router();

ejemplarRoutes.get(
  "/",
  validate(ejemplarFiltrosSchema, "query"),
  ejemplarController.listar,
);

ejemplarRoutes.get(
  "/:codigoBarras",
  validate(ejemplarCodigoBarrasSchema, "params"),
);

ejemplarRoutes.patch(
  "/:codigoBarras",
  validate(ejemplarCodigoBarrasSchema, "params"),
  validate(ejemplarEstadoSchema),
  ejemplarController.actualizarEstado,
);

ejemplarRoutes.delete(
  "/:codigoBarras",
  validate(ejemplarCodigoBarrasSchema, "params"),
  ejemplarController.borrar,
);

export default ejemplarRoutes;
