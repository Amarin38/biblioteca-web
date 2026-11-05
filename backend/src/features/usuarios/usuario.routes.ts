import { Router } from "express";
import express from "express";
import { usuarioController } from "./usuario.controller.ts";
import { validate } from "../../middlewares/validate.ts";
import {
  usuarioFiltrosSchema,
  usuarioIdUsuarioSchema,
  usuarioInputSchema,
  usuarioNuevoSchema,
} from "./usuario.schema.ts";
import { prestamoController } from "../prestamos/prestamo.controller.ts";

const usuarioRoutes = Router();

usuarioRoutes.get(
  "/",
  validate(usuarioFiltrosSchema, "query"),
  usuarioController.listar,
);
usuarioRoutes.get(
  "/:idUsuario",
  validate(usuarioIdUsuarioSchema, "params"),
  usuarioController.obtener,
);
usuarioRoutes.get(
  "/:idUsuario/prestamos",
  validate(usuarioIdUsuarioSchema, "params"),
  prestamoController.obtenerPorUsuario,
);
usuarioRoutes.post("/", validate(usuarioInputSchema), usuarioController.crear);
usuarioRoutes.put(
  "/:idUsuario",
  validate(usuarioIdUsuarioSchema, "params"),
  validate(usuarioNuevoSchema),
  usuarioController.reemplazarUsuario,
);
usuarioRoutes.delete(
  "/:idUsuario",
  validate(usuarioIdUsuarioSchema, "params"),
  usuarioController.borrar,
);

export const authRoutes = Router();
authRoutes.use(express.json());

authRoutes.post("/registro", usuarioController.registrar);
authRoutes.post("/login", usuarioController.login);

export default usuarioRoutes;
