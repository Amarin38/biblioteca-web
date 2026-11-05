import { useState } from "react";
import { Link } from "react-router-dom";
import { ApiError } from "../api/client";
import { ejemplares, libros, prestamos } from "../api/endpoints";
import { useAuth } from "../auth";
import MultaPanel from "../components/MultaPanel";
import PdfViewer from "../components/PdfViewer";
import Shelf, { type EstadoLomo, type ItemEstante } from "../components/Shelf";
import { estaVencido, fecha, vence } from "../format";
import { useFetch } from "../hooks/useFetch";
import type { Libro, Multa, Prestamo } from "../types";

// Un préstamo del usuario junto con su libro y, si venció, su multa
interface Mio {
  prestamo: Prestamo;
  libro: Libro;
  vencido: boolean;
  multa?: Multa | null; // null: no se pudo consultar
  multaPagada?: boolean; // devuelto tarde y con la multa pagada
}

const estadoDe = (m: Mio): EstadoLomo =>
  m.prestamo.estado === "finalizado"
    ? "finalizado"
    : m.vencido
      ? "vencido"
      : "activo";

// Un préstamo vencido nunca se puede leer: hay que pagar la multa, y al pagarla se da de baja solo
const bloqueado = (m: Mio) => m.vencido;

function ayudaDe(m: Mio) {
  const p = m.prestamo;
  if (p.estado === "finalizado") {
    return m.multaPagada
      ? `Multa pagada · devuelto el ${fecha(p.fechaDevolucion)}`
      : `Finalizado el ${fecha(p.fechaDevolucion)}`;
  }
  if (m.vencido)
    return `Venció el ${fecha(vence(p))} · Pagá la multa para darlo de baja`;
  return `Vence el ${fecha(vence(p))}`;
}

export default function PrestamosPage() {
  const { usuario } = useAuth();
  const [msg, setMsg] = useState<string>();
  const [leyendo, setLeyendo] = useState<{ url: string; titulo: string }>();
  const [conMultaId, setConMultaId] = useState<number>();

  // Los préstamos del usuario, con el libro de cada ejemplar (se cruzan los listados) y la multa de los vencidos
  const { data, error, loading, reload } = useFetch(async () => {
    if (!usuario) return [] as Mio[];
    const [todos, ejs, libs] = await Promise.all([
      prestamos.list({ limit: 200 }),
      ejemplares.list({ limit: 200 }),
      libros.list({ limit: 200 }),
    ]);
    const isbnDe = new Map(ejs.map((e) => [e.codigoBarras, e.isbn]));
    const libroDe = new Map(libs.map((l) => [l.isbn, l]));
    const mios = await Promise.all(
      todos
        .filter((p) => p.idUsuario === usuario.idUsuario)
        .map(async (p): Promise<Mio> => {
          const libro =
            libroDe.get(isbnDe.get(p.idEjemplar) ?? "") ??
            ({
              isbn: p.idEjemplar,
              titulo: `Ejemplar ${p.idEjemplar}`,
              autor: "",
              genero: "",
            } as Libro);
          const vencido = estaVencido(p);
          // Devuelto después de su fecha: se mira si se pagó multa para marcarlo como "multa pagada"
          const tardio =
            p.estado === "finalizado" &&
            !!p.fechaDevolucion &&
            p.fechaDevolucion > (vence(p) ?? "9999-12-31");
          const multa =
            vencido || tardio
              ? await prestamos.multa(p.idPrestamo).catch(() => null)
              : undefined;
          return {
            prestamo: p,
            libro,
            vencido,
            multa,
            multaPagada: tardio && !!multa && multa.pagado > 0,
          };
        }),
    );
    // Primero los que se pueden leer o están vencidos, por fecha de vencimiento; los devueltos al final
    return mios.sort(
      (a, b) =>
        Number(a.prestamo.estado === "finalizado") -
          Number(b.prestamo.estado === "finalizado") ||
        (vence(a.prestamo) ?? "").localeCompare(vence(b.prestamo) ?? ""),
    );
  }, [usuario?.idUsuario]);

  // Ejecuta una acción, muestra el mensaje del backend (404/409/422) y refresca
  async function run(action: () => Promise<unknown>) {
    setMsg(undefined);
    try {
      await action();
      reload();
    } catch (e) {
      setMsg(
        e instanceof ApiError
          ? e.message
          : "No se pudo conectar con el servidor",
      );
    }
  }

  // Pagar la multa y dar de baja el préstamo (devolución) en un solo paso
  async function pagarMulta(m: Mio, monto: number) {
    let pagado = false;
    try {
      if (monto > 0) {
        await prestamos.pagar(m.prestamo.idPrestamo, monto);
        pagado = true;
      }
      await prestamos.devolver(m.prestamo.idPrestamo);
      setConMultaId(undefined);
      reload();
      return undefined;
    } catch (e) {
      if (pagado) reload();
      const motivo =
        e instanceof ApiError
          ? e.message
          : "No se pudo conectar con el servidor";
      return pagado
        ? `La multa se pagó, pero no se pudo dar de baja el préstamo: ${motivo}`
        : motivo;
    }
  }

  if (!usuario) {
    return (
      <section className="pagina">
        <header className="pagina-cab">
          <h1>Mis préstamos</h1>
          <p>Ingresá para ver los libros que tenés prestados.</p>
        </header>
        <Link to="/login" className="btn">
          Ingresar
        </Link>
      </section>
    );
  }

  const items: ItemEstante[] = (data ?? []).map((m) => ({
    id: String(m.prestamo.idPrestamo),
    libro: m.libro,
    estado: estadoDe(m),
    bloqueado: bloqueado(m),
    multaPagada: m.multaPagada,
    ayuda: ayudaDe(m),
  }));
  const conMulta =
    conMultaId === undefined
      ? undefined
      : data?.find((x) => x.prestamo.idPrestamo === conMultaId);

  // Hacer clic en un libro: leerlo; si está bloqueado, ver la multa; si ya se devolvió, nada
  function abrir(item: ItemEstante) {
    const m = data?.find((x) => String(x.prestamo.idPrestamo) === item.id);
    if (!m || m.prestamo.estado === "finalizado") return;
    if (bloqueado(m)) setConMultaId(m.prestamo.idPrestamo);
    else
      setLeyendo({
        url: ejemplares.pdfUrlEjemplar(m.prestamo.idEjemplar),
        titulo: m.libro.titulo,
      });
  }

  return (
    <section className="pagina">
      <header className="pagina-cab">
        <h1>Mis préstamos</h1>
        <p>
          Pasá el mouse sobre un libro para ver cuándo vence y hacé clic para
          leerlo. Los libros rojos con candado vencieron: al pagar la multa se
          dan de baja y ya no se pueden leer. Los grises ya fueron devueltos.
        </p>
      </header>

      {msg && (
        <p role="alert" className="aviso">
          {msg}
        </p>
      )}
      {error && (
        <p role="alert" className="aviso">
          {error.message}
        </p>
      )}
      {loading && !data && <p className="vacio">Cargando…</p>}
      {data && data.length === 0 && (
        <p className="vacio">
          Todavía no tenés libros prestados. Elegí uno en la{" "}
          <Link to="/">portada</Link> y registrá el préstamo desde su ficha.
        </p>
      )}

      {items.length > 0 && (
        <>
          <ul className="leyenda" aria-label="Referencias">
            <li>
              <span className="muestra muestra--activo" /> Al día
            </li>
            <li>
              <span className="muestra muestra--vencido" /> Vencido, con multa
            </li>
            <li>
              <span className="muestra muestra--finalizado" /> Devuelto
            </li>
            <li>
              <span className="muestra muestra--finalizado muestra--pagada" />{" "}
              Multa pagada
            </li>
          </ul>
          <Shelf items={items} onOpen={abrir} />

          <h2 className="subtitulo">Detalle</h2>
          <div className="tabla-wrap">
            <table className="registro">
              <caption className="sr-only">Detalle de mis préstamos</caption>
              <thead>
                <tr>
                  <th scope="col">Libro</th>
                  <th scope="col">Fecha</th>
                  <th scope="col">Estado</th>
                  <th scope="col">
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {data?.map((m) => (
                  <tr
                    key={m.prestamo.idPrestamo}
                    className={
                      m.vencido && m.prestamo.estado !== "finalizado"
                        ? "fila--vencida"
                        : undefined
                    }
                  >
                    <td>
                      <strong>{m.libro.titulo}</strong>
                      {m.libro.autor && (
                        <div className="autor-celda">{m.libro.autor}</div>
                      )}
                    </td>
                    <td>
                      {m.prestamo.estado === "finalizado"
                        ? `Devuelto el ${fecha(m.prestamo.fechaDevolucion)}`
                        : `Vence el ${fecha(vence(m.prestamo))}`}
                    </td>
                    <td>
                      {m.multaPagada ? (
                        <span className="badge badge--multa">multa pagada</span>
                      ) : (
                        <span className={`badge badge--${estadoDe(m)}`}>
                          {estadoDe(m)}
                        </span>
                      )}
                    </td>
                    <td className="acciones-fila">
                      {m.prestamo.estado !== "finalizado" && (
                        <>
                          <button
                            className="btn-sm btn-sm--sec"
                            onClick={() =>
                              run(() =>
                                prestamos.renovar(m.prestamo.idPrestamo),
                              )
                            }
                          >
                            Renovar
                          </button>
                          <button
                            className="btn-sm"
                            title="Registra la devolución y finaliza el préstamo"
                            onClick={() =>
                              run(() =>
                                prestamos.devolver(m.prestamo.idPrestamo),
                              )
                            }
                          >
                            Dar de baja
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {leyendo && (
        <PdfViewer
          url={leyendo.url}
          titulo={leyendo.titulo}
          onClose={() => setLeyendo(undefined)}
        />
      )}
      {conMulta && (
        <MultaPanel
          titulo={conMulta.libro.titulo}
          vencio={vence(conMulta.prestamo)}
          multa={conMulta.multa}
          onPagar={(monto) => pagarMulta(conMulta, monto)}
          onClose={() => setConMultaId(undefined)}
        />
      )}
    </section>
  );
}
