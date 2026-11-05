import { useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { ApiError } from "../api/client";
import { ejemplares, libros } from "../api/endpoints";
import { useAuth } from "../auth";
import Dialogo from "../components/Dialogo";
import { fechaLarga } from "../format";
import { GENEROS } from "../generos";
import { useFetch } from "../hooks/useFetch";
import type { EstadoEjemplar, Libro } from "../types";

type Accion =
  | { tipo: "nuevo" }
  | { tipo: "editar"; libro: Libro }
  | { tipo: "baja"; libro: Libro }
  | { tipo: "ejemplares"; libro: Libro };
type Aviso = { ok: boolean; texto: string };

const mensaje = (e: unknown) =>
  e instanceof ApiError ? e.message : "No se pudo conectar con el servidor";
const hoy = () => new Date().toISOString().slice(0, 10);
const ESTADOS: EstadoEjemplar[] = ["disponible", "prestado", "baja"];

// ---------- Página ----------
// La pantalla existe solo para el administrador: para los demás es como si no existiera
export default function CatalogoPage() {
  const { usuario } = useAuth();
  if (!usuario?.admin) return <Navigate to="/" replace />;
  return <CatalogoAdmin />;
}

function CatalogoAdmin() {
  const [busqueda, setBusqueda] = useState("");
  const [accion, setAccion] = useState<Accion>();
  const [aviso, setAviso] = useState<Aviso>();

  const { data, loading, error, reload } = useFetch(async () => {
    const [lista, todos] = await Promise.all([
      libros.list({ titulo: busqueda || undefined, limit: 200 }),
      ejemplares.list({ limit: 200 }),
    ]);
    // Ejemplares de cada libro (sin contar los dados de baja) y cuántos están disponibles
    const conteo = new Map<string, { total: number; disponibles: number }>();
    for (const e of todos) {
      if (e.estado === "baja") continue;
      const c = conteo.get(e.isbn) ?? { total: 0, disponibles: 0 };
      c.total += 1;
      if (e.estado === "disponible") c.disponibles += 1;
      conteo.set(e.isbn, c);
    }
    return { lista, conteo };
  }, [busqueda]);

  const cerrar = () => {
    setAccion(undefined);
    reload();
  };
  const hecho = (texto: string) => {
    setAviso({ ok: true, texto });
    cerrar();
  };

  return (
    <section aria-labelledby="titulo-catalogo">
      <header className="pagina-cab">
        <h1 id="titulo-catalogo">Catálogo</h1>
        <p>Altas, modificaciones y bajas de libros y de sus ejemplares.</p>
      </header>

      <div className="admin-barra">
        <label>
          Buscar por título
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </label>
        <button onClick={() => setAccion({ tipo: "nuevo" })}>
          Nuevo libro
        </button>
      </div>

      {aviso && (
        <p
          role="status"
          className={aviso.ok ? "mensaje mensaje--ok" : "mensaje"}
        >
          {aviso.texto}
        </p>
      )}
      {error && (
        <p role="alert" className="mensaje">
          {mensaje(error)}
        </p>
      )}
      {loading && !data && <p>Cargando…</p>}

      {data && (
        <div className="tabla-wrap">
          <table className="registro">
            <caption className="sr-only">Libros del catálogo</caption>
            <thead>
              <tr>
                <th scope="col">Título</th>
                <th scope="col">Género</th>
                <th scope="col">ISBN</th>
                <th scope="col">Ejemplares disponibles</th>
                <th scope="col">
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {data.lista.map((l) => {
                const c = data.conteo.get(l.isbn) ?? {
                  total: 0,
                  disponibles: 0,
                };
                return (
                  <tr key={l.isbn}>
                    <th scope="row">
                      <strong>{l.titulo}</strong>
                      <div className="autor-celda">{l.autor}</div>
                    </th>
                    <td>{l.genero}</td>
                    <td>
                      <code>{l.isbn}</code>
                    </td>
                    <td>
                      {c.disponibles} de {c.total}
                    </td>
                    <td className="acciones-fila">
                      <button
                        className="btn-sec"
                        aria-label={`Editar ${l.titulo}`}
                        onClick={() => setAccion({ tipo: "editar", libro: l })}
                      >
                        Editar
                      </button>
                      <button
                        className="btn-sec"
                        aria-label={`Ejemplares de ${l.titulo}`}
                        onClick={() =>
                          setAccion({ tipo: "ejemplares", libro: l })
                        }
                      >
                        Ejemplares
                      </button>
                      <button
                        className="btn-peligro"
                        aria-label={`Eliminar ${l.titulo}`}
                        onClick={() => setAccion({ tipo: "baja", libro: l })}
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                );
              })}
              {data.lista.length === 0 && (
                <tr>
                  <td colSpan={5}>
                    {busqueda
                      ? "No hay libros que coincidan."
                      : "Todavía no hay libros cargados."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {accion?.tipo === "nuevo" && (
        <DialogoNuevo
          onCerrar={() => setAccion(undefined)}
          onHecho={(l) =>
            hecho(
              `Libro «${l.titulo}» creado. Agregale ejemplares desde «Ejemplares».`,
            )
          }
        />
      )}
      {accion?.tipo === "editar" && (
        <DialogoEditar
          libro={accion.libro}
          onCerrar={() => setAccion(undefined)}
          onHecho={(l) => hecho(`Libro «${l.titulo}» actualizado.`)}
        />
      )}
      {accion?.tipo === "baja" && (
        <DialogoBaja
          libro={accion.libro}
          onCerrar={() => setAccion(undefined)}
          onHecho={() => hecho(`Libro «${accion.libro.titulo}» eliminado.`)}
          onEjemplares={() =>
            setAccion({ tipo: "ejemplares", libro: accion.libro })
          }
        />
      )}
      {accion?.tipo === "ejemplares" && (
        <DialogoEjemplares libro={accion.libro} onCerrar={cerrar} />
      )}
    </section>
  );
}

// ---------- Alta ----------
function DialogoNuevo({
  onCerrar,
  onHecho,
}: {
  onCerrar: () => void;
  onHecho: (l: Libro) => void;
}) {
  const [f, setF] = useState({
    isbn: "",
    titulo: "",
    autor: "",
    genero: "",
    fechaLanzamiento: "",
    sinopsis: "",
  });
  const [error, setError] = useState<string>();
  const [enviando, setEnviando] = useState(false);
  const campo = (k: keyof typeof f) => ({
    value: f[k],
    onChange: (e: { target: { value: string } }) =>
      setF({ ...f, [k]: e.target.value }),
  });

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setError(undefined);
    setEnviando(true);
    try {
      const creado = await libros.create({
        isbn: f.isbn.trim(),
        titulo: f.titulo.trim(),
        autor: f.autor.trim(),
        genero: f.genero,
        fechaLanzamiento: f.fechaLanzamiento,
        ...(f.sinopsis.trim() ? { sinopsis: f.sinopsis.trim() } : {}),
      });
      onHecho(creado);
    } catch (err) {
      setError(mensaje(err));
      setEnviando(false);
    }
  }

  return (
    <Dialogo titulo="Nuevo libro" onCerrar={onCerrar}>
      <form className="form-admin" onSubmit={enviar}>
        <label>
          ISBN
          <input
            required
            minLength={10}
            maxLength={20}
            autoFocus
            {...campo("isbn")}
          />
        </label>
        <label>
          Título
          <input required maxLength={200} {...campo("titulo")} />
        </label>
        <label>
          Autor
          <input required maxLength={200} {...campo("autor")} />
        </label>
        <label>
          Género
          <select required {...campo("genero")}>
            <option value="">Elegí un género</option>
            {GENEROS.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </label>
        <label>
          Fecha de lanzamiento
          <input
            type="date"
            required
            max={hoy()}
            {...campo("fechaLanzamiento")}
          />
        </label>
        <label>
          Sinopsis (opcional)
          <textarea rows={4} maxLength={2000} {...campo("sinopsis")} />
        </label>
        {error && (
          <p role="alert" className="mensaje">
            {error}
          </p>
        )}
        <div className="acciones-form">
          <button type="button" className="btn-sec" onClick={onCerrar}>
            Cancelar
          </button>
          <button disabled={enviando}>Crear libro</button>
        </div>
      </form>
    </Dialogo>
  );
}

// ---------- Modificación ----------
function DialogoEditar({
  libro,
  onCerrar,
  onHecho,
}: {
  libro: Libro;
  onCerrar: () => void;
  onHecho: (l: Libro) => void;
}) {
  const [titulo, setTitulo] = useState(libro.titulo);
  const [sinopsis, setSinopsis] = useState(libro.sinopsis ?? "");
  const [error, setError] = useState<string>();
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setError(undefined);
    // El backend solo modifica el título y la sinopsis, y solo se envía lo que cambió
    const cambios: { titulo?: string; sinopsis?: string } = {};
    if (titulo.trim() !== libro.titulo) cambios.titulo = titulo.trim();
    if (sinopsis.trim() && sinopsis.trim() !== (libro.sinopsis ?? ""))
      cambios.sinopsis = sinopsis.trim();
    if (!cambios.titulo && !cambios.sinopsis)
      return setError("No hay cambios para guardar.");
    setEnviando(true);
    try {
      onHecho(await libros.update(libro.isbn, cambios));
    } catch (err) {
      setError(mensaje(err));
      setEnviando(false);
    }
  }

  return (
    <Dialogo titulo="Modificar libro" onCerrar={onCerrar}>
      <dl className="datos-fijos">
        <div>
          <dt>ISBN</dt>
          <dd>{libro.isbn}</dd>
        </div>
        <div>
          <dt>Autor</dt>
          <dd>{libro.autor}</dd>
        </div>
        <div>
          <dt>Género</dt>
          <dd>{libro.genero}</dd>
        </div>
        <div>
          <dt>Lanzamiento</dt>
          <dd>{fechaLarga(libro.fechaLanzamiento)}</dd>
        </div>
      </dl>
      <form className="form-admin" onSubmit={enviar}>
        <label>
          Título
          <input
            required
            maxLength={200}
            autoFocus
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
          />
        </label>
        <label>
          Sinopsis
          <textarea
            rows={5}
            maxLength={2000}
            value={sinopsis}
            onChange={(e) => setSinopsis(e.target.value)}
          />
        </label>
        <p className="ayuda-form">
          Del libro solo se pueden modificar el título y la sinopsis.
        </p>
        {error && (
          <p role="alert" className="mensaje">
            {error}
          </p>
        )}
        <div className="acciones-form">
          <button type="button" className="btn-sec" onClick={onCerrar}>
            Cancelar
          </button>
          <button disabled={enviando}>Guardar cambios</button>
        </div>
      </form>
    </Dialogo>
  );
}

// ---------- Baja ----------
function DialogoBaja({
  libro,
  onCerrar,
  onHecho,
  onEjemplares,
}: {
  libro: Libro;
  onCerrar: () => void;
  onHecho: () => void;
  onEjemplares: () => void;
}) {
  const [error, setError] = useState<string>();
  const [conEjemplares, setConEjemplares] = useState(false);
  const [enviando, setEnviando] = useState(false);

  async function eliminar() {
    setError(undefined);
    setEnviando(true);
    try {
      await libros.remove(libro.isbn);
      onHecho();
    } catch (err) {
      // 409: el backend no deja eliminar un libro que todavía tiene ejemplares
      setConEjemplares(err instanceof ApiError && err.status === 409);
      setError(mensaje(err));
      setEnviando(false);
    }
  }

  return (
    <Dialogo titulo="Eliminar libro" onCerrar={onCerrar}>
      <p>
        ¿Eliminar <strong>{libro.titulo}</strong>? Esta acción no se puede
        deshacer.
      </p>
      {error && (
        <p role="alert" className="mensaje">
          {error}
        </p>
      )}
      <div className="acciones-form">
        <button type="button" className="btn-sec" onClick={onCerrar}>
          Cancelar
        </button>
        {conEjemplares && (
          <button type="button" className="btn-sec" onClick={onEjemplares}>
            Ver ejemplares
          </button>
        )}
        <button className="btn-peligro" disabled={enviando} onClick={eliminar}>
          Eliminar libro
        </button>
      </div>
    </Dialogo>
  );
}

// ---------- Ejemplares del libro (alta, cambio de estado y baja) ----------
function DialogoEjemplares({
  libro,
  onCerrar,
}: {
  libro: Libro;
  onCerrar: () => void;
}) {
  const { data, loading, reload } = useFetch(
    () => libros.ejemplares(libro.isbn),
    [libro.isbn],
  );
  const [codigo, setCodigo] = useState("");
  const [error, setError] = useState<string>();

  async function ejecutar(accion: () => Promise<unknown>) {
    setError(undefined);
    try {
      await accion();
      reload();
    } catch (err) {
      setError(mensaje(err));
    }
  }

  // Código de 13 caracteres: los primeros 12 del ISBN más el número de copia libre
  const sugerido = () => {
    const usados = new Set(data?.map((e) => e.codigoBarras));
    const base = libro.isbn.replace(/\D/g, "").padEnd(12, "0").slice(0, 12);
    for (let n = 1; n <= 9; n++)
      if (!usados.has(`${base}${n}`)) return `${base}${n}`;
    return "";
  };

  function agregar(e: FormEvent) {
    e.preventDefault();
    void ejecutar(async () => {
      await libros.addEjemplar(libro.isbn, { codigoBarras: codigo.trim() });
      await ejemplares.setEstado(codigo.trim(), "disponible"); // el backend crea los ejemplares como "prestado"
      setCodigo("");
    });
  }

  return (
    <Dialogo titulo={`Ejemplares de ${libro.titulo}`} onCerrar={onCerrar}>
      {loading && !data && <p>Cargando…</p>}
      {data && data.length === 0 && (
        <p>Este libro todavía no tiene ejemplares.</p>
      )}
      {data && data.length > 0 && (
        <div className="tabla-wrap">
          <table className="registro registro--chico">
            <caption className="sr-only">Ejemplares del libro</caption>
            <thead>
              <tr>
                <th scope="col">Código de barras</th>
                <th scope="col">Estado</th>
                <th scope="col">
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((e) => (
                <tr key={e.codigoBarras}>
                  <th scope="row">
                    <code>{e.codigoBarras}</code>
                  </th>
                  <td>
                    <select
                      aria-label={`Estado del ejemplar ${e.codigoBarras}`}
                      value={e.estado}
                      onChange={(ev) =>
                        void ejecutar(() =>
                          ejemplares.setEstado(
                            e.codigoBarras,
                            ev.target.value as EstadoEjemplar,
                          ),
                        )
                      }
                    >
                      {ESTADOS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <button
                      className="btn-peligro"
                      aria-label={`Eliminar el ejemplar ${e.codigoBarras}`}
                      onClick={() =>
                        void ejecutar(() => ejemplares.remove(e.codigoBarras))
                      }
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="ayuda-form">
        Un ejemplar con préstamos solo se puede eliminar si está en estado
        «baja»: se elimina junto con su historial.
      </p>
      <form className="form-admin form-admin--fila" onSubmit={agregar}>
        <label>
          Nuevo ejemplar (13 caracteres)
          <input
            required
            minLength={13}
            maxLength={13}
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
          />
        </label>
        <button
          type="button"
          className="btn-sec"
          onClick={() => setCodigo(sugerido())}
        >
          Sugerir código
        </button>
        <button>Agregar</button>
      </form>
      {error && (
        <p role="alert" className="mensaje">
          {error}
        </p>
      )}
      <div className="acciones-form">
        <button type="button" className="btn-sec" onClick={onCerrar}>
          Cerrar
        </button>
      </div>
    </Dialogo>
  );
}
