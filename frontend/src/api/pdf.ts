import { leerToken } from "./sesion";

// Los PDF se piden con el token del usuario; el servidor solo los entrega si tiene el libro prestado.
export const cabecerasPdf = (): Record<string, string> => {
  const token = leerToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export interface InfoPdf {
  ok: boolean;
  status: number;
  nombre?: string; // el archivo se llama como el libro
}

// Consulta (HEAD) si el PDF existe y si el usuario puede leerlo: 200, 401 (sin sesión), 403 (sin préstamo) o 404 (sin PDF)
export async function infoPdf(url: string): Promise<InfoPdf> {
  const r = await fetch(url, { method: "HEAD", headers: cabecerasPdf() });
  const m = /filename\*=UTF-8''([^;]+)/i.exec(
    r.headers.get("content-disposition") ?? "",
  );
  return {
    ok: r.ok,
    status: r.status,
    nombre: m ? decodeURIComponent(m[1]).replace(/\.pdf$/i, "") : undefined,
  };
}

// Abre el PDF en otra pestaña: se descarga con el token y se muestra desde un blob
export async function abrirEnPestana(url: string) {
  const ventana = window.open("", "_blank");
  try {
    const r = await fetch(url, { headers: cabecerasPdf() });
    if (!r.ok) throw new Error(`Error ${r.status}`);
    const href = URL.createObjectURL(await r.blob());
    if (ventana) ventana.location.href = href;
    else window.open(href, "_blank");
  } catch (e) {
    ventana?.close();
    throw e;
  }
}
