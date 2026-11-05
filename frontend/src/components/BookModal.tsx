import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ApiError } from "../api/client";
import { libros, prestamos } from "../api/endpoints";
import { useAuth } from "../auth";
import { estaVencido, fechaLarga, vence } from "../format";
import { useFetch } from "../hooks/useFetch";
import { IconCandado, IconCerrar } from "./Icons";
import type { Libro } from "../types";

interface Props {
  libro: Libro;
  tone: string;
  onClose: () => void;
  onPrestamo?: () => void; // avisa que se registró un préstamo (para actualizar la portada)
}

export default function BookModal({ libro, tone, onClose, onPrestamo }: Props) {
  const { usuario } = useAuth();
  const usuarioId = usuario?.idUsuario;
  const { data: ejs, reload } = useFetch(
    () => libros.ejemplares(libro.isbn),
    [libro.isbn],
  );
  const disponibles = ejs?.filter((e) => e.estado === "disponible") ?? [];

  // ¿Ya tiene este libro prestado el usuario? (un préstamo de alguno de sus ejemplares que no esté finalizado)
  const { data: todos, reload: recargarPrestamos } = useFetch(
    () => (usuarioId ? prestamos.list({ limit: 200 }) : Promise.resolve([])),
    [usuarioId],
  );
  const codigos = new Set(ejs?.map((e) => e.codigoBarras));
  const mio = todos?.find(
    (p) =>
      p.idUsuario === usuarioId &&
      p.estado !== "finalizado" &&
      codigos.has(p.idEjemplar),
  );
  const listo = !!ejs && !!todos;
  // Con un préstamo vencido sin devolver (multa pendiente) no se pueden pedir más libros
  const conMulta = !!todos?.some(
    (p) =>
      p.idUsuario === usuarioId && p.estado !== "finalizado" && estaVencido(p),
  );

  const [recien, setRecien] = useState(false); // el préstamo se acaba de registrar: el sello cae con animación
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function prestar() {
    if (!usuario || !disponibles[0] || conMulta) return;
    setError(undefined);
    setEnviando(true);
    try {
      await prestamos.create({
        idUsuario: usuario.idUsuario,
        idEjemplar: disponibles[0].codigoBarras,
      });
      setRecien(true);
      reload();
      recargarPrestamos();
      onPrestamo?.();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "No se pudo conectar con el servidor",
      );
    } finally {
      setEnviando(false);
    }
  }

  const vencido = mio ? estaVencido(mio) : false;

  return (
    <div className="overlay" onClick={onClose}>
      <button className="book-close" onClick={onClose} aria-label="Cerrar">
        <IconCerrar />
      </button>

      <div
        className={`book tone--${tone}`}
        role="dialog"
        aria-modal="true"
        aria-label={libro.titulo}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Página derecha: info y préstamo */}
        <article className="page page--right">
          <h2>{libro.titulo}</h2>
          <p className="autor">{libro.autor}</p>
          <p className="rule" aria-hidden="true">
            ◆
          </p>
          <dl className="info">
            <div>
              <dt>Género</dt>
              <dd>{libro.genero}</dd>
            </div>
            <div>
              <dt>ISBN</dt>
              <dd>{libro.isbn}</dd>
            </div>
            {libro.fechaLanzamiento && (
              <div>
                <dt>Publicación</dt>
                <dd>{libro.fechaLanzamiento.slice(0, 4)}</dd>
              </div>
            )}
            <div>
              <dt>Disponibles</dt>
              <dd>
                <span
                  className={`dot${ejs && disponibles.length === 0 ? " dot--no" : ""}`}
                />
                {ejs ? `${disponibles.length} de ${ejs.length}` : "…"}
              </dd>
            </div>
          </dl>

          <div className="acciones">
            {error && <p role="alert">{error}</p>}

            {mio ? (
              // Boleta de préstamo, como la que se sellaba en el mostrador
              <>
                <section
                  className={`boleta${vencido ? " boleta--vencida" : ""}${recien ? " boleta--nueva" : ""}`}
                  aria-live="polite"
                >
                  <div className="sello" aria-hidden="true">
                    <span>
                      <small>Biblioteca</small>
                      <b>{vencido ? "VENCIDO" : "PRESTADO"}</b>
                    </span>
                  </div>
                  <p className="boleta-titulo">
                    {recien ? "Préstamo registrado" : "Lo tenés prestado"}
                  </p>
                  <p className="boleta-rotulo">
                    {vencido ? "Venció el" : "Devolvelo antes del"}
                  </p>
                  <p className="boleta-fecha">{fechaLarga(vence(mio))}</p>
                  <p className="boleta-datos">
                    <span>Ejemplar {mio.idEjemplar}</span>
                    {usuario && <span>{usuario.nombre}</span>}
                  </p>
                </section>
                <Link
                  to="/prestamos"
                  className="btn btn-ghost"
                  onClick={onClose}
                >
                  {vencido
                    ? "Pagar la multa en Mis préstamos"
                    : "Ver en Mis préstamos"}
                </Link>
              </>
            ) : usuario && conMulta ? (
              <>
                <p className="aviso-multa" role="alert">
                  <IconCandado />
                  <span>
                    Tenés una multa pendiente: no podés pedir más libros hasta
                    pagarla.
                  </span>
                </p>
                <Link
                  to="/prestamos"
                  className="btn btn-ghost"
                  onClick={onClose}
                >
                  Pagar la multa en Mis préstamos
                </Link>
              </>
            ) : usuario ? (
              <>
                <button
                  disabled={!listo || disponibles.length === 0 || enviando}
                  onClick={prestar}
                >
                  Registrar préstamo
                </button>
                {ejs && disponibles.length === 0 && (
                  <p>No hay ejemplares disponibles.</p>
                )}
              </>
            ) : (
              <Link to="/login" className="btn" onClick={onClose}>
                Ingresá para pedir prestado
              </Link>
            )}
          </div>
        </article>

        {/* Tapa: al abrirse, su reverso es la página izquierda (sinopsis) */}
        <div className="cover">
          <div className="cover-front">
            <span>{libro.titulo}</span>
            <small>{libro.autor}</small>
          </div>
          <div className="cover-back page">
            <h3>Sinopsis</h3>
            <p className="rule" aria-hidden="true">
              ◆
            </p>
            {libro.sinopsis ? (
              <p className="sinopsis" lang="es">
                {libro.sinopsis}
              </p>
            ) : (
              <p className="sinopsis sinopsis--vacia">
                Este libro todavía no tiene sinopsis cargada.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
