import { api } from "./client";
import type {
  Ejemplar,
  EstadoEjemplar,
  EstadoPrestamo,
  Libro,
  Multa,
  Pago,
  Prestamo,
  Reporte,
  Usuario,
} from "../types";

type Page = { limit?: number; offset?: number };

// El backend acepta uno o varios: se envía siempre un array y se devuelve el primero
async function crear<T>(path: string, body: unknown): Promise<T> {
  const r = await api<T | T[]>("POST", path, { body: [body] });
  return Array.isArray(r) ? r[0] : r;
}

export const libros = {
  list: (q: Page & { titulo?: string; autor?: string; genero?: string } = {}) =>
    api<Libro[]>("GET", "/libros", { query: q }),
  get: (isbn: string) => api<Libro>("GET", `/libros/${isbn}`),
  ejemplares: (isbn: string) =>
    api<Ejemplar[]>("GET", `/libros/${isbn}/ejemplares`),
  create: (body: Libro) => crear<Libro>("/libros", body),
  addEjemplar: (isbn: string, body: { codigoBarras: string }) =>
    crear<Ejemplar>(`/libros/${isbn}/ejemplares`, body),
  // El backend solo modifica el título y la sinopsis
  update: (isbn: string, body: { titulo?: string; sinopsis?: string }) =>
    api<Libro>("PATCH", `/libros/${isbn}`, { body }),
  remove: (isbn: string) => api<void>("DELETE", `/libros/${isbn}`),
  // El servidor sirve "<título del libro>.pdf" solo a quien tiene el libro prestado (ver api/pdf.ts)
  pdfUrl: (isbn: string) => `/api/libros/${isbn}/pdf`,
  // Mismo PDF, partiendo del código de barras del ejemplar (sirve desde un préstamo)
};

export const reportes = {
  resumen: () => api<Reporte>("GET", "/reportes/resumen"),
};

export const ejemplares = {
  list: (q: Page & { estado?: EstadoEjemplar } = {}) =>
    api<Ejemplar[]>("GET", "/ejemplares", { query: q }),
  get: (cb: string) => api<Ejemplar>("GET", `/ejemplares/${cb}`),
  pdfUrlEjemplar: (codigoBarras: string) =>
    `/api/ejemplares/${codigoBarras}/pdf`,
  setEstado: (cb: string, estado: EstadoEjemplar) =>
    api<Ejemplar>("PATCH", `/ejemplares/${cb}`, { body: { estado } }),
  remove: (cb: string) => api<void>("DELETE", `/ejemplares/${cb}`),
};

export const usuarios = {
  list: (q: Page & { nombre?: string; email?: string; tipo?: string } = {}) =>
    api<Usuario[]>("GET", "/usuarios", { query: q }),
  get: (id: number) => api<Usuario>("GET", `/usuarios/${id}`),
  prestamos: (id: number) =>
    api<Prestamo[]>("GET", `/usuarios/${id}/prestamos`),
  create: (body: Omit<Usuario, "idUsuario">) =>
    crear<Usuario>("/usuarios", body),
  update: (id: number, body: Omit<Usuario, "idUsuario">) =>
    api<Usuario>("PUT", `/usuarios/${id}`, { body }),
  remove: (id: number) => api<void>("DELETE", `/usuarios/${id}`),
};

export const prestamos = {
  list: (q: Page & { estado?: EstadoPrestamo } = {}) =>
    api<Prestamo[]>("GET", "/prestamos", { query: q }),
  get: (id: number) => api<Prestamo>("GET", `/prestamos/${id}`),
  create: (body: { idUsuario: number; idEjemplar: string }) =>
    crear<Prestamo>("/prestamos", body),
  devolver: (id: number) =>
    api<Prestamo>("POST", `/prestamos/${id}/devolucion`),
  renovar: (id: number) =>
    api<Prestamo>("POST", `/prestamos/${id}/renovaciones`),
  setEstado: (id: number, estado: EstadoPrestamo) =>
    api<Prestamo>("PATCH", `/prestamos/${id}`, { body: { estado } }),
  remove: (id: number) => api<void>("DELETE", `/prestamos/${id}`),
  multa: (id: number) => api<Multa>("GET", `/prestamos/${id}/multa`),
  pagos: (id: number) => api<Pago[]>("GET", `/prestamos/${id}/multa/pagos`),
  pagar: (id: number, monto: number) =>
    api<Pago>("POST", `/prestamos/${id}/multa/pagos`, { body: { monto } }),
};
