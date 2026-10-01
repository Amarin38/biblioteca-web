import { Router } from "express";
import { libroController } from "./libro.controller.ts";
import { validate } from "../../middlewares/validate.ts";
import {
  libroFiltrosSchema,
  libroIsbnSchema,
  libroInputSchema,
  libroTituloSchema,
} from "./libro.schema.ts";
import { ejemplarController } from "../ejemplares/ejemplar.controller.ts";
import { ejemplarInputSchema } from "../ejemplares/ejemplar.schema.ts";

const libroRoutes = Router();

libroRoutes.get(
  "/",
  validate(libroFiltrosSchema, "query"),
  libroController.listar,
);

libroRoutes.get(
  "/:isbn",
  validate(libroIsbnSchema, "params"),
  libroController.obtener,
);

libroRoutes.get(
  "/:isbn/ejemplares",
  validate(libroIsbnSchema, "params"),
  ejemplarController.obtenerPorIsbn,
);

libroRoutes.post("/", validate(libroInputSchema), libroController.crear);

libroRoutes.post(
  "/:isbn/ejemplares",
  validate(libroIsbnSchema, "params"),
  validate(ejemplarInputSchema),
  ejemplarController.crear,
);

libroRoutes.patch(
  "/:isbn",
  validate(libroIsbnSchema, "params"),
  validate(libroTituloSchema),
  libroController.actualizarTitulo,
);

libroRoutes.delete(
  "/:isbn",
  validate(libroIsbnSchema, "params"),
  libroController.borrar,
);

export default libroRoutes;
