import { api } from "./client";
import type { Sesion } from "./sesion";

export const registrar = (nombre: string, email: string, password: string) =>
  api<Sesion>("POST", "/auth/registro", { body: { nombre, email, password } });

export const ingresar = (email: string, password: string) =>
  api<Sesion>("POST", "/auth/login", { body: { email, password } });
