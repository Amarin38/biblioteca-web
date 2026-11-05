import { useEffect } from "react";
import { createPortal } from "react-dom";
import { abrirEnPestana, infoPdf } from "../api/pdf";
import { useAuth } from "../auth";
import { useFetch } from "../hooks/useFetch";
import { IconCerrar, IconExterno } from "./Icons";
import LibroPdf from "./LibroPdf";

interface Props {
  url: string;
  titulo?: string;
  onClose: () => void;
}

// Lector dentro de la página: el PDF que sirve el backend se abre como un libro con páginas que se pasan
export default function PdfViewer({ url, titulo: tituloDado, onClose }: Props) {
  const { usuario } = useAuth();
  const usuarioId = usuario?.idUsuario;
  const { data: info, loading } = useFetch(
    () => infoPdf(url),
    [url, usuarioId],
  );
  const disponible = info?.ok;
  const titulo = tituloDado ?? info?.nombre ?? "Libro";

  // Escape cierra solo el lector (y no el libro que está detrás)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopImmediatePropagation();
      onClose();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  return createPortal(
    <div
      className="lector"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
    >
      <div
        className="lector-panel"
        role="dialog"
        aria-modal="true"
        aria-label={`PDF de ${titulo}`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="lector-barra">
          <h2>{titulo}</h2>
          {disponible && (
            <button
              className="lector-enlace"
              onClick={() => void abrirEnPestana(url)}
            >
              <IconExterno /> Abrir en otra pestaña
            </button>
          )}
          <button
            className="lector-cerrar"
            onClick={onClose}
            aria-label="Cerrar el PDF"
          >
            <IconCerrar />
          </button>
        </header>
        <div className="lector-cuerpo">
          {loading && <p className="lector-aviso">Cargando…</p>}
          {info?.status === 401 && (
            <p className="lector-aviso">Iniciá sesión para leer este libro.</p>
          )}
          {info?.status === 403 && (
            <p className="lector-aviso">
              Para leer este libro tenés que registrar el préstamo.
            </p>
          )}
          {info?.status === 404 && (
            <p className="lector-aviso">
              Este libro todavía no tiene un PDF disponible.
            </p>
          )}
          {info &&
            !info.ok &&
            info.status !== 401 &&
            info.status !== 403 &&
            info.status !== 404 && (
              <p className="lector-aviso">
                No se pudo abrir el PDF (error {info.status}).
              </p>
            )}
          {disponible && <LibroPdf url={url} />}
        </div>
      </div>
    </div>,
    document.body,
  );
}
