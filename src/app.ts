import express from "express";
import swaggerUi from "swagger-ui-express";
import { openapiSpec } from "./docs/openapi.ts";
import libroRoutes from "./features/libros/libro.routes.ts";
import usuarioRoutes from "./features/usuarios/usuario.routes.ts";
import ejemplarRoutes from "./features/ejemplares/ejemplar.routes.ts";
import prestamoRoutes from "./features/prestamos/prestamo.routes.ts";

export function createApp() {
  const app = express();
  app.use(express.json());

  app.use("/docs", swaggerUi.serve, swaggerUi.setup(openapiSpec));
  app.get("/health", (req, res) => res.json({ ok: true }));
  app.use("/api/libros", libroRoutes);
  app.use("/api/usuarios", usuarioRoutes);
  app.use("/api/ejemplares", ejemplarRoutes);
  app.use("/api/prestamos", prestamoRoutes);

  app.use((req, res) => res.status(404).json({ error: "Ruta no encontrada." }));
  app.use((err, req, res, next) => {
    if (!err.status) console.error(err);
    res.status(err.status ?? 500).json({ error: err.message });
  });

  return app;
}
