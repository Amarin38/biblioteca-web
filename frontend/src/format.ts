import type { Prestamo } from "./types";

// 'AAAA-MM-DD' se toma como fecha local; con new Date('AAAA-MM-DD') se muestra un día antes en Argentina (UTC-3)
export const fecha = (iso?: string) =>
  iso
    ? new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString("es-AR")
    : "–";

export const vence = (p: Prestamo) => p.fechaVencimiento ?? p.fechaDevolucion;

// Fecha de hoy como 'AAAA-MM-DD', en hora local
export const hoy = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

// Vencido: el backend lo marcó así, o sigue activo y ya pasó la fecha límite
export const estaVencido = (p: Prestamo) =>
  p.estado === "vencido" ||
  (p.estado === "activo" && (vence(p) ?? "9999-12-31") < hoy());

// Fecha en palabras: "19 de noviembre de 2026"
export const fechaLarga = (iso?: string) =>
  iso
    ? new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString("es-AR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "–";
