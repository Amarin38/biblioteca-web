import type { Usuario } from "../types";

const CLAVE = "biblioteca:sesion";

export interface Sesion {
  token: string; // JWT que entrega el backend al ingresar
  usuario: Usuario;
}

// Vencimiento (exp, en segundos) que trae el token. La firma la verifica el servidor; acá solo se lee la fecha.
export function vencimiento(token: string): number | undefined {
  try {
    const cuerpo = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const exp = (JSON.parse(atob(cuerpo)) as { exp?: number }).exp;
    return typeof exp === "number" ? exp * 1000 : undefined;
  } catch {
    return undefined;
  }
}

export function leerSesion(): Sesion | undefined {
  localStorage.removeItem("biblioteca:usuario"); // sesión del ingreso anterior, solo con el email
  try {
    const s = JSON.parse(
      localStorage.getItem(CLAVE) ?? "null",
    ) as Sesion | null;
    if (!s?.token || !s.usuario) return undefined;
    const exp = vencimiento(s.token);
    if (exp !== undefined && exp <= Date.now()) {
      localStorage.removeItem(CLAVE);
      return undefined;
    }
    return s;
  } catch {
    return undefined;
  }
}

export const guardarSesion = (s: Sesion) =>
  localStorage.setItem(CLAVE, JSON.stringify(s));
export const borrarSesion = () => localStorage.removeItem(CLAVE);
export const leerToken = () => leerSesion()?.token;
