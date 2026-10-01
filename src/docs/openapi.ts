import { z } from "zod";
import { createDocument } from "zod-openapi";
import {
  libroNuevoSchema,
  libroInputSchema,
  libroFiltrosSchema,
  libroIsbnSchema,
  libroTituloSchema,
} from "../features/libros/libro.schema.ts";

import {
  ejemplarNuevoSchema,
  ejemplarInputSchema,
  ejemplarFiltrosSchema,
  ejemplarCodigoBarrasSchema,
  ejemplarEstadoSchema,
} from "../features/ejemplares/ejemplar.schema.ts";

import {
  usuarioNuevoSchema,
  usuarioInputSchema,
  usuarioFiltrosSchema,
  usuarioIdUsuarioSchema,
} from "../features/usuarios/usuario.schema.ts";

import {
  prestamoNuevoSchema,
  prestamoInputSchema,
  prestamoFiltrosSchema,
  prestamoIdPrestamoSchema,
  prestamoEstadoSchema,
  prestamoPagoNuevoSchema,
  prestamoMultaSchema,
} from "../features/prestamos/prestamo.schema.ts";

import { errorSchema } from "../shared/error.schema.ts";

// ── Helpers ──────────────────────────────────────────────
const json = (schema: z.ZodType) => ({
  content: { "application/json": { schema } },
});
const err = (description: string) => ({ description, ...json(errorSchema) });

export const openapiSpec = createDocument({
  openapi: "3.1.0",
  info: { title: "Biblioteca API", version: "1.0.0" },
  tags: [
    { name: "Libros" },
    { name: "Ejemplares" },
    { name: "Usuarios" },
    { name: "Préstamos" },
    { name: "Pagos de multa" },
  ],
  paths: {
    // ── Libros ─────────────────────────────────────────────
    "/api/libros": {
      get: {
        tags: ["Libros"],
        summary: "Listar libros",
        requestParams: { query: libroFiltrosSchema },
        responses: {
          200: { description: "OK", ...json(z.array(libroNuevoSchema)) },
          400: err("Query inválida"),
        },
      },
      post: {
        tags: ["Libros"],
        summary: "Crear libro",
        requestBody: json(libroInputSchema),
        responses: {
          201: { description: "Libro creado", ...json(libroNuevoSchema) },
          400: err("Body inválido"),
          409: err("ISBN ya registrado"),
        },
      },
    },
    "/api/libros/{isbn}": {
      get: {
        tags: ["Libros"],
        summary: "Obtener libro por ISBN",
        requestParams: { path: libroIsbnSchema },
        responses: {
          200: { description: "OK", ...json(libroNuevoSchema) },
          404: err("Libro inexistente"),
        },
      },
      patch: {
        tags: ["Libros"],
        summary: "Modificar libro",
        requestParams: { path: libroIsbnSchema },
        requestBody: json(libroTituloSchema),
        responses: {
          200: { description: "Libro actualizado", ...json(libroNuevoSchema) },
          400: err("Body inválido"),
          404: err("Libro inexistente"),
        },
      },
      delete: {
        tags: ["Libros"],
        summary: "Eliminar libro",
        requestParams: { path: libroIsbnSchema },
        responses: {
          204: { description: "Libro eliminado" },
          404: err("Libro inexistente"),
          409: err("Tiene ejemplares asociados"),
        },
      },
    },
    "/api/libros/{isbn}/ejemplares": {
      get: {
        tags: ["Libros", "Ejemplares"],
        summary: "Listar ejemplares de un libro",
        requestParams: { path: libroIsbnSchema },
        responses: {
          200: { description: "OK", ...json(z.array(ejemplarNuevoSchema)) },
          404: err("Libro inexistente"),
        },
      },
      post: {
        tags: ["Libros", "Ejemplares"],
        summary: "Crear ejemplar de un libro",
        requestParams: { path: libroIsbnSchema },
        requestBody: json(ejemplarInputSchema),
        responses: {
          201: { description: "Ejemplar creado", ...json(ejemplarNuevoSchema) },
          400: err("Body inválido"),
          404: err("Libro inexistente"),
          409: err("Código de barras duplicado"),
        },
      },
    },

    // ── Ejemplares ─────────────────────────────────────────
    "/api/ejemplares": {
      get: {
        tags: ["Ejemplares"],
        summary: "Listar ejemplares",
        requestParams: { query: ejemplarFiltrosSchema },
        responses: {
          200: { description: "OK", ...json(z.array(ejemplarNuevoSchema)) },
          400: err("Query inválida"),
        },
      },
    },
    "/api/ejemplares/{codigoBarras}": {
      get: {
        tags: ["Ejemplares"],
        summary: "Obtener ejemplar",
        requestParams: { path: ejemplarCodigoBarrasSchema },
        responses: {
          200: { description: "OK", ...json(ejemplarNuevoSchema) },
          404: err("Ejemplar inexistente"),
        },
      },
      patch: {
        tags: ["Ejemplares"],
        summary: "Cambiar estado del ejemplar",
        requestParams: { path: ejemplarCodigoBarrasSchema },
        requestBody: json(ejemplarEstadoSchema),
        responses: {
          200: {
            description: "Ejemplar actualizado",
            ...json(ejemplarNuevoSchema),
          },
          400: err("Body inválido"),
          404: err("Ejemplar inexistente"),
        },
      },
      delete: {
        tags: ["Ejemplares"],
        summary: "Eliminar ejemplar",
        requestParams: { path: ejemplarCodigoBarrasSchema },
        responses: {
          204: { description: "Ejemplar eliminado" },
          404: err("Ejemplar inexistente"),
          409: err("Tiene préstamo activo"),
        },
      },
    },

    // ── Usuarios ───────────────────────────────────────────
    "/api/usuarios": {
      get: {
        tags: ["Usuarios"],
        summary: "Listar usuarios",
        requestParams: { query: usuarioFiltrosSchema },
        responses: {
          200: { description: "OK", ...json(z.array(usuarioNuevoSchema)) },
          400: err("Query inválida"),
        },
      },
      post: {
        tags: ["Usuarios"],
        summary: "Crear usuario",
        requestBody: json(usuarioInputSchema),
        responses: {
          201: { description: "Usuario creado", ...json(usuarioNuevoSchema) },
          400: err("Body inválido"),
        },
      },
    },
    "/api/usuarios/{idUsuario}": {
      get: {
        tags: ["Usuarios"],
        summary: "Obtener usuario",
        requestParams: { path: usuarioIdUsuarioSchema },
        responses: {
          200: { description: "OK", ...json(usuarioNuevoSchema) },
          404: err("Usuario inexistente"),
        },
      },
      put: {
        tags: ["Usuarios"],
        summary: "Reemplazar usuario",
        requestParams: { path: usuarioIdUsuarioSchema },
        requestBody: json(usuarioNuevoSchema),
        responses: {
          200: {
            description: "Usuario actualizado",
            ...json(usuarioNuevoSchema),
          },
          400: err("Body inválido"),
          404: err("Usuario inexistente"),
        },
      },
      delete: {
        tags: ["Usuarios"],
        summary: "Eliminar usuario",
        requestParams: { path: usuarioIdUsuarioSchema },
        responses: {
          204: { description: "Usuario eliminado" },
          404: err("Usuario inexistente"),
          409: err("Tiene préstamos activos"),
        },
      },
    },
    "/api/usuarios/{idUsuario}/prestamos": {
      get: {
        tags: ["Usuarios", "Préstamos"],
        summary: "Listar préstamos de un usuario",
        requestParams: { path: usuarioIdUsuarioSchema },
        responses: {
          200: { description: "OK", ...json(z.array(prestamoNuevoSchema)) },
          404: err("Usuario inexistente"),
        },
      },
    },

    // ── Préstamos ──────────────────────────────────────────
    "/api/prestamos": {
      get: {
        tags: ["Préstamos"],
        summary: "Listar préstamos",
        requestParams: { query: prestamoFiltrosSchema },
        responses: {
          200: { description: "OK", ...json(z.array(prestamoNuevoSchema)) },
          400: err("Query inválida"),
        },
      },
      post: {
        tags: ["Préstamos"],
        summary: "Crear préstamo",
        requestBody: json(prestamoInputSchema),
        responses: {
          201: { description: "Préstamo creado", ...json(prestamoNuevoSchema) },
          400: err("Body inválido"),
          404: err("Usuario o ejemplar inexistente"),
          409: err("Ejemplar no disponible"),
          422: err("Usuario con límite alcanzado o multa impaga"),
        },
      },
    },
    "/api/prestamos/{idPrestamo}": {
      get: {
        tags: ["Préstamos"],
        summary: "Obtener préstamo",
        requestParams: { path: prestamoIdPrestamoSchema },
        responses: {
          200: { description: "OK", ...json(prestamoNuevoSchema) },
          404: err("Préstamo inexistente"),
        },
      },
      patch: {
        tags: ["Préstamos"],
        summary: "Cambiar estado del préstamo",
        requestParams: { path: prestamoIdPrestamoSchema },
        requestBody: json(prestamoEstadoSchema),
        responses: {
          200: {
            description: "Préstamo actualizado",
            ...json(prestamoNuevoSchema),
          },
          400: err("Body inválido"),
          404: err("Préstamo inexistente"),
        },
      },
      delete: {
        tags: ["Préstamos"],
        summary: "Eliminar préstamo",
        requestParams: { path: prestamoIdPrestamoSchema },
        responses: {
          204: { description: "Préstamo eliminado" },
          404: err("Préstamo inexistente"),
          409: err("Préstamo activo"),
        },
      },
    },
    "/api/prestamos/{idPrestamo}/devolucion": {
      post: {
        tags: ["Préstamos"],
        summary: "Registrar devolución",
        requestParams: { path: prestamoIdPrestamoSchema },
        responses: {
          200: {
            description: "Préstamo finalizado",
            ...json(prestamoNuevoSchema),
          },
          404: err("Préstamo inexistente"),
          409: err("Préstamo ya finalizado"),
        },
      },
    },
    "/api/prestamos/{idPrestamo}/renovaciones": {
      post: {
        tags: ["Préstamos"],
        summary: "Renovar préstamo",
        requestParams: { path: prestamoIdPrestamoSchema },
        responses: {
          201: {
            description: "Préstamo renovado",
            ...json(prestamoNuevoSchema),
          },
          404: err("Préstamo inexistente"),
          409: err("Préstamo finalizado"),
          422: err("Máximo de renovaciones alcanzado o préstamo vencido"),
        },
      },
    },
    "/api/prestamos/{idPrestamo}/multa": {
      get: {
        tags: ["Préstamos"],
        summary: "Consultar multa",
        requestParams: { path: prestamoIdPrestamoSchema },
        responses: {
          200: { description: "OK", ...json(prestamoMultaSchema) },
          404: err("Préstamo inexistente"),
        },
      },
    },

    // ── Pagos de multa ─────────────────────────────────────
    "/api/prestamos/{idPrestamo}/multa/pagos": {
      get: {
        tags: ["Pagos de multa"],
        summary: "Listar pagos de la multa",
        requestParams: { path: prestamoIdPrestamoSchema },
        responses: {
          200: { description: "OK", ...json(z.array(prestamoPagoNuevoSchema)) },
          404: err("Préstamo inexistente"),
        },
      },
      post: {
        tags: ["Pagos de multa"],
        summary: "Registrar pago",
        requestParams: { path: prestamoIdPrestamoSchema },
        requestBody: json(prestamoPagoNuevoSchema),
        responses: {
          201: {
            description: "Pago registrado",
            ...json(prestamoPagoNuevoSchema),
          },
          400: err("Body inválido o monto mayor al saldo"),
          404: err("Préstamo inexistente"),
          409: err("Sin multa pendiente"),
        },
      },
    },
  },
});
