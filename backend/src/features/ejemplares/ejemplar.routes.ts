import { Router } from "express";
import { ejemplarController } from "./ejemplar.controller.ts";
import { validate } from "../../middlewares/validate.ts";
import {
  ejemplarCodigoBarrasSchema,
  ejemplarEstadoSchema,
  ejemplarFiltrosSchema,
} from "./ejemplar.schema.ts";
import { type Request, type Response } from "express";
import { libroController } from "../libros/libro.controller.ts";
import { ejemplarService } from "./ejemplar.service.ts";
import { prestamoRepository } from "../prestamos/prestamo.repository.ts";
import { usuarioDeRequest } from "../../middlewares/auth.ts";

const ejemplarRoutes = Router();

ejemplarRoutes.get(
  "/",
  validate(ejemplarFiltrosSchema, "query"),
  ejemplarController.listar,
);

ejemplarRoutes.get(
  "/:codigoBarras",
  validate(ejemplarCodigoBarrasSchema, "params"),
  ejemplarController.obtener,
);

ejemplarRoutes.get(
  "/:codigoBarras/pdf",
  async (req: Request<{ codigoBarras: string }>, res: Response) => {
    const { codigoBarras } = req.params;
    const usuario = await usuarioDeRequest(req);
    const ejemplar = ejemplarService.obtener(codigoBarras); // 404 si no existe
    libroController.servirPdf(
      ejemplar.isbn,
      res,
      !!usuario,
      !!usuario &&
        prestamoRepository.prestamoDelEjemplar(usuario.id, codigoBarras),
    );
  },
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
