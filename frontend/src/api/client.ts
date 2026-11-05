import { borrarSesion, leerToken } from "./sesion";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export type Query = Record<string, string | number | undefined>;

function qs(q?: Query) {
  if (!q) return "";
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(q))
    if (v !== undefined && v !== "") p.set(k, String(v));
  const s = p.toString();
  return s ? `?${s}` : "";
}

export async function api<T>(
  method: string,
  path: string,
  opts: { query?: Query; body?: unknown } = {},
): Promise<T> {
  const hasBody = opts.body !== undefined;
  const token = leerToken();
  const res = await fetch(`/api${path}${qs(opts.query)}`, {
    method,
    headers: {
      ...(hasBody ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: hasBody ? JSON.stringify(opts.body) : undefined,
  });

  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    // El servidor rechazó el token (venció o ya no es válido): se cierra la sesión
    if (res.status === 401 && token) {
      borrarSesion();
      window.dispatchEvent(new Event("sesion-vencida"));
    }
    throw new ApiError(
      res.status,
      data?.error ?? data?.message ?? res.statusText,
    );
  }
  return data as T;
}
