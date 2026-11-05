import { Router, type Request, type Response } from "express";
import { libroController } from "./libro.controller.ts";
import { validate } from "../../middlewares/validate.ts";
import {
  libroFiltrosSchema,
  libroIsbnSchema,
  libroInputSchema,
  libroTituloSchema,
} from "./libro.schema.ts";
import { ejemplarController } from "../ejemplares/ejemplar.controller.ts";
import { ejemplarService } from "../ejemplares/ejemplar.service.ts";
import { ejemplarInputSchema } from "../ejemplares/ejemplar.schema.ts";
import { prestamoRepository } from "../prestamos/prestamo.repository.ts";
import { usuarioDeRequest } from "../../middlewares/auth.ts";

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

libroRoutes.get(
  "/:isbn/pdf",
  validate(libroIsbnSchema, "params"),
  async (req: Request<{ isbn: string }>, res: Response) => {
    const usuario = await usuarioDeRequest(req);
    libroController.servirPdf(
      req.params.isbn,
      res,
      !!usuario,
      !!usuario &&
        prestamoRepository.prestamoDelLibro(usuario.id, req.params.isbn),
    );
  },
);

export default libroRoutes;
