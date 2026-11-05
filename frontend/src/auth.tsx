import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { ingresar, registrar as registrarCuenta } from "./api/auth";
import {
  borrarSesion,
  guardarSesion,
  leerSesion,
  vencimiento,
  type Sesion,
} from "./api/sesion";
import type { Usuario } from "./types";

interface Auth {
  usuario?: Usuario;
  login: (email: string, password: string) => Promise<void>;
  registrar: (nombre: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const Ctx = createContext<Auth>(null!);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [sesion, setSesion] = useState(leerSesion);

  // El servidor rechazó el token (venció o ya no es válido)
  useEffect(() => {
    const alVencer = () => setSesion(undefined);
    window.addEventListener("sesion-vencida", alVencer);
    return () => window.removeEventListener("sesion-vencida", alVencer);
  }, []);

  // La sesión se cierra sola cuando vence el token
  useEffect(() => {
    const exp = sesion && vencimiento(sesion.token);
    if (!exp) return;
    const t = setTimeout(
      () => {
        borrarSesion();
        setSesion(undefined);
      },
      Math.min(Math.max(exp - Date.now(), 0), 2 ** 31 - 1),
    );
    return () => clearTimeout(t);
  }, [sesion]);

  const abrir = (s: Sesion) => {
    guardarSesion(s);
    setSesion(s);
  };

  return (
    <Ctx.Provider
      value={{
        usuario: sesion?.usuario,
        login: async (email, password) =>
          abrir(await ingresar(email, password)),
        registrar: async (nombre, email, password) =>
          abrir(await registrarCuenta(nombre, email, password)),
        logout: () => {
          borrarSesion();
          setSesion(undefined);
        },
      }}
    >
      {children}
    </Ctx.Provider>
  );
}
