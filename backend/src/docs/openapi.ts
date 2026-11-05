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
  registroSchema,
  loginSchema,
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

const bearer = [{ bearerAuth: [] }];
const sesion = { 401: err("Falta iniciar sesión o el token no es válido") };
const admin = { ...sesion, 403: err("Solo para administradores") };
const propio = { ...sesion, 403: err("El recurso pertenece a otro usuario") };

const sesionSchema = z.object({
  token: z.string(),
  usuario: z.object({
    idUsuario: z.number().int(),
    nombre: z.string(),
    email: z.string(),
    tipo: z.string(),
    admin: z.boolean(),
  }),
});

const reporteSchema = z.record(z.string(), z.unknown());
const pdfSchema = z.string().meta({ format: "binary" });
const pdf = {
  200: {
    description: "PDF del libro",
    content: { "application/pdf": { schema: pdfSchema } },
  },
  ...sesion,
  403: err("Sin préstamo vigente del libro"),
  404: err("Libro o ejemplar inexistente, o sin PDF disponible"),
};

export const openapiSpec = createDocument({
  openapi: "3.1.0",
  info: {
    title: "Biblioteca API",
    version: "1.0.0",
    description:
      "Para probar los endpoints protegidos: ejecutá POST /auth/login, copiá el `token` de la respuesta, hacé clic en **Authorize** y pegalo (sin la palabra Bearer).",
  },
  servers: [{ url: "/api" }],
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
    },
  },
  tags: [
    { name: "Autenticación" },
    { name: "Libros" },
    { name: "Ejemplares" },
    { name: "Usuarios" },
    { name: "Préstamos" },
    { name: "Pagos de multa" },
    { name: "Reportes" },
  ],
  paths: {
    // ── Autenticación ──────────────────────────────────────
    "/auth/registro": {
      post: {
        tags: ["Autenticación"],
        summary: "Registrar una cuenta (siempre de tipo normal)",
        requestBody: json(registroSchema),
        responses: {
          201: { description: "Cuenta creada", ...json(sesionSchema) },
          400: err("Body inválido"),
          409: err("Ya existe una cuenta con ese email"),
        },
      },
    },
    "/auth/login": {
      post: {
        tags: ["Autenticación"],
        summary: "Iniciar sesión",
        requestBody: json(loginSchema),
        responses: {
          200: { description: "Sesión iniciada", ...json(sesionSchema) },
          400: err("Body inválido"),
          401: err("Email o contraseña incorrectos"),
          429: err("Demasiados intentos fallidos"),
        },
      },
    },

    // ── Libros (consultar es público; modificar exige admin) ──
    "/libros": {
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
        security: bearer,
        requestBody: json(libroInputSchema),
        responses: {
          201: { description: "Libro creado", ...json(libroNuevoSchema) },
          400: err("Body inválido"),
          ...admin,
          409: err("ISBN ya registrado"),
        },
      },
    },
    "/libros/{isbn}": {
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
        summary: "Modificar título o sinopsis",
        security: bearer,
        requestParams: { path: libroIsbnSchema },
        requestBody: json(libroTituloSchema),
        responses: {
          200: { description: "Libro actualizado", ...json(libroNuevoSchema) },
          400: err("Body inválido"),
          ...admin,
          404: err("Libro inexistente"),
        },
      },
      delete: {
        tags: ["Libros"],
        summary: "Eliminar libro",
        security: bearer,
        requestParams: { path: libroIsbnSchema },
        responses: {
          204: { description: "Libro eliminado" },
          ...admin,
          404: err("Libro inexistente"),
          409: err("Tiene ejemplares asociados"),
        },
      },
    },
    "/libros/{isbn}/ejemplares": {
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
        summary: "Crear ejemplares de un libro",
        security: bearer,
        requestParams: { path: libroIsbnSchema },
        requestBody: json(ejemplarInputSchema),
        responses: {
          201: { description: "Ejemplar creado", ...json(ejemplarNuevoSchema) },
          400: err("Body inválido"),
          ...admin,
          404: err("Libro inexistente"),
          409: err("Código de barras duplicado"),
        },
      },
    },
    "/libros/{isbn}/pdf": {
      get: {
        tags: ["Libros"],
        summary: "Leer el PDF de un libro (requiere préstamo vigente)",
        security: bearer,
        requestParams: { path: libroIsbnSchema },
        responses: pdf,
      },
    },

    // ── Ejemplares ─────────────────────────────────────────
    "/ejemplares": {
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
    "/ejemplares/{codigoBarras}": {
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
        security: bearer,
        requestParams: { path: ejemplarCodigoBarrasSchema },
        requestBody: json(ejemplarEstadoSchema),
        responses: {
          200: {
            description: "Ejemplar actualizado",
            ...json(ejemplarNuevoSchema),
          },
          400: err("Body inválido"),
          ...admin,
          404: err("Ejemplar inexistente"),
        },
      },
      delete: {
        tags: ["Ejemplares"],
        summary: "Eliminar ejemplar (solo si está dado de baja)",
        security: bearer,
        requestParams: { path: ejemplarCodigoBarrasSchema },
        responses: {
          204: { description: "Ejemplar eliminado" },
          ...admin,
          404: err("Ejemplar inexistente"),
          409: err("No está dado de baja o tiene un préstamo activo"),
        },
      },
    },
    "/ejemplares/{codigoBarras}/pdf": {
      get: {
        tags: ["Ejemplares"],
        summary:
          "Leer el PDF del libro de un ejemplar (requiere préstamo vigente)",
        security: bearer,
        requestParams: { path: ejemplarCodigoBarrasSchema },
        responses: pdf,
      },
    },

    // ── Usuarios (cada usuario solo accede al suyo) ────────
    "/usuarios": {
      get: {
        tags: ["Usuarios"],
        summary: "Listar usuarios",
        security: bearer,
        requestParams: { query: usuarioFiltrosSchema },
        responses: {
          200: { description: "OK", ...json(z.array(usuarioNuevoSchema)) },
          400: err("Query inválida"),
          ...propio,
        },
      },
      post: {
        tags: ["Usuarios"],
        summary: "Crear usuario",
        security: bearer,
        requestBody: json(usuarioInputSchema),
        responses: {
          201: { description: "Usuario creado", ...json(usuarioNuevoSchema) },
          400: err("Body inválido"),
          ...propio,
        },
      },
    },
    "/usuarios/{idUsuario}": {
      get: {
        tags: ["Usuarios"],
        summary: "Obtener usuario",
        security: bearer,
        requestParams: { path: usuarioIdUsuarioSchema },
        responses: {
          200: { description: "OK", ...json(usuarioNuevoSchema) },
          ...propio,
          404: err("Usuario inexistente"),
        },
      },
      put: {
        tags: ["Usuarios"],
        summary: "Reemplazar usuario",
        security: bearer,
        requestParams: { path: usuarioIdUsuarioSchema },
        requestBody: json(usuarioNuevoSchema),
        responses: {
          200: {
            description: "Usuario actualizado",
            ...json(usuarioNuevoSchema),
          },
          400: err("Body inválido"),
          ...propio,
          404: err("Usuario inexistente"),
          409: err("Email ya registrado"),
        },
      },
      delete: {
        tags: ["Usuarios"],
        summary: "Eliminar usuario",
        security: bearer,
        requestParams: { path: usuarioIdUsuarioSchema },
        responses: {
          204: { description: "Usuario eliminado" },
          ...propio,
          404: err("Usuario inexistente"),
          409: err("Tiene préstamos registrados"),
        },
      },
    },
    "/usuarios/{idUsuario}/prestamos": {
      get: {
        tags: ["Usuarios", "Préstamos"],
        summary: "Listar préstamos de un usuario",
        security: bearer,
        requestParams: { path: usuarioIdUsuarioSchema },
        responses: {
          200: { description: "OK", ...json(z.array(prestamoNuevoSchema)) },
          ...propio,
          404: err("Usuario inexistente"),
        },
      },
    },

    // ── Préstamos (cada usuario solo opera sobre los suyos) ──
    "/prestamos": {
      get: {
        tags: ["Préstamos"],
        summary: "Listar mis préstamos",
        security: bearer,
        requestParams: { query: prestamoFiltrosSchema },
        responses: {
          200: { description: "OK", ...json(z.array(prestamoNuevoSchema)) },
          400: err("Query inválida"),
          ...sesion,
        },
      },
      post: {
        tags: ["Préstamos"],
        summary: "Crear préstamo (a nombre propio)",
        security: bearer,
        requestBody: json(prestamoInputSchema),
        responses: {
          201: { description: "Préstamo creado", ...json(prestamoNuevoSchema) },
          400: err("Body inválido"),
          ...propio,
          404: err("Usuario o ejemplar inexistente"),
          409: err("Ejemplar no disponible"),
        },
      },
    },
    "/prestamos/{idPrestamo}": {
      get: {
        tags: ["Préstamos"],
        summary: "Obtener préstamo",
        security: bearer,
        requestParams: { path: prestamoIdPrestamoSchema },
        responses: {
          200: { description: "OK", ...json(prestamoNuevoSchema) },
          ...propio,
          404: err("Préstamo inexistente"),
        },
      },
      patch: {
        tags: ["Préstamos"],
        summary: "Cambiar estado del préstamo",
        security: bearer,
        requestParams: { path: prestamoIdPrestamoSchema },
        requestBody: json(prestamoEstadoSchema),
        responses: {
          200: {
            description: "Préstamo actualizado",
            ...json(prestamoNuevoSchema),
          },
          400: err("Body inválido"),
          ...propio,
          404: err("Préstamo inexistente"),
        },
      },
      delete: {
        tags: ["Préstamos"],
        summary: "Eliminar préstamo",
        security: bearer,
        requestParams: { path: prestamoIdPrestamoSchema },
        responses: {
          204: { description: "Préstamo eliminado" },
          ...propio,
          404: err("Préstamo inexistente"),
          409: err("Préstamo activo"),
        },
      },
    },
    "/prestamos/{idPrestamo}/devolucion": {
      post: {
        tags: ["Préstamos"],
        summary: "Registrar devolución",
        security: bearer,
        requestParams: { path: prestamoIdPrestamoSchema },
        responses: {
          200: {
            description: "Préstamo finalizado",
            ...json(prestamoNuevoSchema),
          },
          ...propio,
          404: err("Préstamo inexistente"),
          409: err("Préstamo ya finalizado o con multa pendiente"),
        },
      },
    },
    "/prestamos/{idPrestamo}/renovaciones": {
      post: {
        tags: ["Préstamos"],
        summary: "Renovar préstamo",
        security: bearer,
        requestParams: { path: prestamoIdPrestamoSchema },
        responses: {
          201: {
            description: "Préstamo renovado",
            ...json(prestamoNuevoSchema),
          },
          ...propio,
          404: err("Préstamo inexistente"),
          409: err(
            "No está activo, está vencido o llegó al máximo de renovaciones",
          ),
        },
      },
    },
    "/prestamos/{idPrestamo}/multa": {
      get: {
        tags: ["Préstamos"],
        summary: "Consultar multa",
        security: bearer,
        requestParams: { path: prestamoIdPrestamoSchema },
        responses: {
          200: { description: "OK", ...json(prestamoMultaSchema) },
          ...propio,
          404: err("Préstamo inexistente"),
        },
      },
    },

    // ── Pagos de multa ─────────────────────────────────────
    "/prestamos/{idPrestamo}/multa/pagos": {
      get: {
        tags: ["Pagos de multa"],
        summary: "Listar pagos de la multa",
        security: bearer,
        requestParams: { path: prestamoIdPrestamoSchema },
        responses: {
          200: { description: "OK", ...json(z.array(prestamoPagoNuevoSchema)) },
          ...propio,
          404: err("Préstamo inexistente"),
        },
      },
      post: {
        tags: ["Pagos de multa"],
        summary: "Registrar pago",
        security: bearer,
        requestParams: { path: prestamoIdPrestamoSchema },
        requestBody: json(prestamoPagoNuevoSchema),
        responses: {
          201: {
            description: "Pago registrado",
            ...json(prestamoPagoNuevoSchema),
          },
          400: err("Body inválido o monto mayor al saldo"),
          ...propio,
          404: err("Préstamo inexistente"),
          409: err("Sin multa pendiente"),
        },
      },
    },

    // ── Reportes (solo admin) ──────────────────────────────
    "/reportes/resumen": {
      get: {
        tags: ["Reportes"],
        summary:
          "Totales, libros más prestados y préstamos por género y por mes",
        security: bearer,
        responses: {
          200: { description: "OK", ...json(reporteSchema) },
          ...admin,
        },
      },
    },
  },
});
