import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import swaggerUi from "swagger-ui-express";
import { openapiSpec } from "./docs/openapi.ts";
import libroRoutes from "./features/libros/libro.routes.ts";
import usuarioRoutes, {
  authRoutes,
} from "./features/usuarios/usuario.routes.ts";
import ejemplarRoutes from "./features/ejemplares/ejemplar.routes.ts";
import prestamoRoutes from "./features/prestamos/prestamo.routes.ts";
import { reporteRouter } from "./features/reportes/reporte.routes.ts";
import {
  autenticar,
  soloAdmin,
  adminParaModificar,
  prestamosPropios,
  usuariosPropios,
} from "./middlewares/auth.ts";
import { errores } from "./shared/errors.ts";

export function createApp() {
  const app = express();
  app.use(express.json());

  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(openapiSpec));
  app.use("/api/auth", authRoutes);
  app.use("/api/reportes", autenticar, soloAdmin, reporteRouter);
  app.use("/api/libros", adminParaModificar, libroRoutes);
  app.use("/api/ejemplares", adminParaModificar, ejemplarRoutes);
  app.use("/api/usuarios", autenticar, usuariosPropios, usuarioRoutes);
  app.use("/api/prestamos", autenticar, prestamosPropios, prestamoRoutes);

  app.use((_req, _res, next) => next(errores.general.rutaNoEncontrada()));

  app.use(
    (
      err: Error & { status?: number },
      _req: Request,
      res: Response,
      _next: NextFunction,
    ) => {
      if (!err.status) console.error(err);
      res.status(err.status ?? 500).json({ error: err.message });
    },
  );

  return app;
}
