import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { ejemplares, libros, prestamos } from "../api/endpoints";
import { useAuth } from "../auth";
import BookModal from "../components/BookModal";
import {
  IconAlerta,
  IconEjemplares,
  IconLibro,
  IconReloj,
} from "../components/Icons";
import Shelf from "../components/Shelf";
import { estaVencido, fecha, vence } from "../format";
import { useFetch } from "../hooks/useFetch";
import type { Libro } from "../types";

export default function HomePage() {
  const { usuario } = useAuth();
  const [q, setQ] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [abierto, setAbierto] = useState<{ libro: Libro; tone: string }>();

  // Sin endpoint de conteo: se usa el largo de cada listado
  const {
    data,
    loading,
    error,
    reload: recargarCifras,
  } = useFetch(async () => {
    const [l, e] = await Promise.all([
      libros.list({ limit: 200 }),
      ejemplares.list({ estado: "disponible", limit: 200 }),
    ]);
    // Títulos y ejemplares disponibles son de toda la biblioteca: un ejemplar prestado le resta a todos.
    // Los préstamos activos y vencidos son de cada usuario, y solo se piden con sesión iniciada.
    const conStock = new Set(e.map((x) => x.isbn)); // libros con al menos un ejemplar disponible
    if (!usuario)
      return {
        libros: l.length,
        disponibles: e.length,
        conStock,
        activos: undefined,
        vencidos: undefined,
      };
    const todos = (await prestamos.list({ limit: 200 })).filter(
      (p) => p.idUsuario === usuario.idUsuario,
    );
    // Vencidos: pasaron su fecha y no se devolvieron. Al pagar la multa el préstamo se da de baja solo y deja de contar.
    const enCurso = todos.filter((p) => p.estado !== "finalizado");
    const vencidos = enCurso.filter(estaVencido);
    return {
      libros: l.length,
      disponibles: e.length,
      conStock,
      activos: enCurso.length - vencidos.length,
      vencidos,
    };
  }, [usuario?.idUsuario]);
  const vencidos = data?.vencidos;

  // Se trae el catálogo filtrado (hasta 200) y el estante lo recorre de a un libro
  const { data: lista, error: errorLista } = useFetch(
    () => libros.list({ titulo: busqueda || undefined, limit: 200 }),
    [busqueda],
  );

  // Filtra mientras se escribe
  useEffect(() => {
    const t = setTimeout(() => {
      setBusqueda(q.trim());
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  function buscar(ev: FormEvent) {
    ev.preventDefault();
    setBusqueda(q.trim());
  }

  // Mientras se recargan, se siguen viendo las cifras anteriores
  const n = (v?: number) => v ?? (loading ? "…" : "–");

  return (
    <>
      <section className="hero">
        <h1>¿Qué libro buscás?</h1>
        <form className="search" onSubmit={buscar} role="search">
          <input
            type="search"
            placeholder="Título del libro"
            aria-label="Buscar por título"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button>Buscar</button>
        </form>
      </section>

      {(error || errorLista) && (
        <p role="alert">
          No se pudieron cargar los datos: {(error ?? errorLista)?.message}
        </p>
      )}

      <dl className="stats">
        <div className="stat">
          <span className="stat-icono">
            <IconLibro />
          </span>
          <dt>Títulos</dt>
          <dd>{n(data?.libros)}</dd>
        </div>
        <div className="stat">
          <span className="stat-icono">
            <IconEjemplares />
          </span>
          <dt>Ejemplares disponibles</dt>
          <dd>{n(data?.disponibles)}</dd>
        </div>
        <div className="stat">
          <span className="stat-icono">
            <IconReloj />
          </span>
          <dt>Mis préstamos activos</dt>
          <dd>{n(data?.activos)}</dd>
        </div>
        <div
          className={
            vencidos && vencidos.length > 0 ? "stat stat--alerta" : "stat"
          }
        >
          <span className="stat-icono">
            <IconAlerta />
          </span>
          <dt>Mis vencidos</dt>
          <dd>{n(vencidos?.length)}</dd>
        </div>
      </dl>

      <div className="shelf-head">
        <h2>
          {busqueda ? `Resultados para “${busqueda}”` : "Libros destacados"}
        </h2>
      </div>
      {lista && lista.length === 0 && (
        <p>
          {busqueda
            ? "No hay libros que coincidan."
            : "Todavía no hay libros cargados."}
        </p>
      )}
      {lista && lista.length > 0 && (data || error) && (
        <Shelf
          key={busqueda}
          // Sin ejemplares disponibles el libro se ve gris, como uno ya devuelto, y no se abre
          items={lista.map((libro) =>
            data && !data.conStock.has(libro.isbn)
              ? {
                  id: libro.isbn,
                  libro,
                  estado: "finalizado" as const,
                  ayuda: "Sin ejemplares disponibles",
                }
              : { id: libro.isbn, libro },
          )}
          onOpen={(item, tone) => setAbierto({ libro: item.libro, tone })}
        />
      )}

      {vencidos && (
        <section className="overdue">
          <h2>Mis préstamos vencidos</h2>
          {vencidos.length === 0 && <p>No hay préstamos vencidos.</p>}
          {vencidos.length > 0 && (
            <ul>
              {vencidos.slice(0, 5).map((p) => (
                <li key={p.idPrestamo}>
                  <Link to={`/prestamos/${p.idPrestamo}`}>
                    Préstamo {p.idPrestamo} · ejemplar {p.idEjemplar}
                  </Link>
                  <span>venció el {fecha(vence(p))}</span>
                </li>
              ))}
            </ul>
          )}
          {vencidos.length > 5 && (
            <Link to="/prestamos">Ver los {vencidos.length} vencidos</Link>
          )}
        </section>
      )}

      {abierto && (
        <BookModal
          libro={abierto.libro}
          tone={abierto.tone}
          onClose={() => setAbierto(undefined)}
          onPrestamo={recargarCifras}
        />
      )}
    </>
  );
}
