import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { ApiError } from "../api/client";
import { reportes } from "../api/endpoints";
import { useAuth } from "../auth";
import { fechaLarga } from "../format";
import { useFetch } from "../hooks/useFetch";

const plata = (n: number) => `$ ${n.toLocaleString("es-AR")}`;
const mesLargo = (mes: string) =>
  new Date(`${mes}-01T00:00:00`).toLocaleDateString("es-AR", {
    month: "long",
    year: "numeric",
  });

interface Fila {
  clave: string;
  etiqueta: ReactNode;
  valor: number;
}

// Tabla con una barra proporcional: los números siguen en el texto, la barra es solo apoyo visual
function Barras({
  titulo,
  columna,
  filas,
}: {
  titulo: string;
  columna: string;
  filas: Fila[];
}) {
  const max = Math.max(1, ...filas.map((f) => f.valor));
  return (
    <div className="tabla-wrap">
      <table className="registro registro--chico barras">
        <caption className="sr-only">{titulo}</caption>
        <thead>
          <tr>
            <th scope="col">{columna}</th>
            <th scope="col">Préstamos</th>
            <th scope="col">
              <span className="sr-only">Proporción</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {filas.map((f) => (
            <tr key={f.clave}>
              <th scope="row">{f.etiqueta}</th>
              <td>{f.valor}</td>
              <td className="celda-barra" aria-hidden="true">
                {f.valor > 0 && (
                  <span
                    className="barra"
                    style={{ width: `${(f.valor / max) * 100}%` }}
                  />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Dato({
  rotulo,
  valor,
  alerta,
}: {
  rotulo: string;
  valor: ReactNode;
  alerta?: boolean;
}) {
  return (
    <div className={alerta ? "dato dato--alerta" : "dato"}>
      <dt>{rotulo}</dt>
      <dd>{valor}</dd>
    </div>
  );
}

// La pantalla existe solo para el administrador: para los demás es como si no existiera
export default function ReportesPage() {
  const { usuario } = useAuth();
  if (!usuario?.admin) return <Navigate to="/" replace />;
  return <Reportes />;
}

function Reportes() {
  const { data: r, loading, error } = useFetch(() => reportes.resumen());

  return (
    <section aria-labelledby="titulo-reportes">
      <header className="pagina-cab">
        <h1 id="titulo-reportes">Reportes</h1>
        <p>
          {r
            ? `Estado de la biblioteca al ${fechaLarga(r.generadoEn)}.`
            : "Estado general de la biblioteca y préstamos más frecuentes."}
        </p>
      </header>

      {loading && !r && <p>Cargando…</p>}
      {error && (
        <p role="alert" className="mensaje">
          {error instanceof ApiError
            ? error.message
            : "No se pudo conectar con el servidor"}
        </p>
      )}

      {r && (
        <>
          <section aria-labelledby="rep-resumen">
            <h2 id="rep-resumen">Resumen</h2>
            <dl className="resumen">
              <Dato rotulo="Títulos" valor={r.libros} />
              <Dato rotulo="Usuarios" valor={r.usuarios} />
              <Dato rotulo="Ejemplares" valor={r.ejemplares.total} />
              <Dato rotulo="Disponibles" valor={r.ejemplares.disponible} />
              <Dato rotulo="Prestados" valor={r.ejemplares.prestado} />
              <Dato rotulo="Dados de baja" valor={r.ejemplares.baja} />
              <Dato rotulo="Préstamos activos" valor={r.prestamos.activo} />
              <Dato
                rotulo="Préstamos vencidos"
                valor={r.prestamos.vencido}
                alerta={r.prestamos.vencido > 0}
              />
              <Dato
                rotulo="Préstamos finalizados"
                valor={r.prestamos.finalizado}
              />
              <Dato rotulo="Multas cobradas" valor={plata(r.multasCobradas)} />
            </dl>
          </section>

          <section aria-labelledby="rep-libros">
            <h2 id="rep-libros">Libros más prestados</h2>
            {r.masPrestados.length === 0 ? (
              <p>Todavía no hay préstamos registrados.</p>
            ) : (
              <Barras
                titulo="Libros más prestados"
                columna="Libro"
                filas={r.masPrestados.map((l) => ({
                  clave: l.isbn,
                  etiqueta: (
                    <>
                      <strong>{l.titulo}</strong>
                      <div className="autor-celda">{l.autor}</div>
                    </>
                  ),
                  valor: l.prestamos,
                }))}
              />
            )}
          </section>

          <section aria-labelledby="rep-genero">
            <h2 id="rep-genero">Préstamos por género</h2>
            {r.porGenero.length === 0 ? (
              <p>Todavía no hay préstamos registrados.</p>
            ) : (
              <Barras
                titulo="Préstamos por género"
                columna="Género"
                filas={r.porGenero.map((g) => ({
                  clave: g.genero,
                  etiqueta: g.genero,
                  valor: g.prestamos,
                }))}
              />
            )}
          </section>

          <section aria-labelledby="rep-mes">
            <h2 id="rep-mes">Préstamos por mes</h2>
            <Barras
              titulo="Préstamos iniciados en los últimos seis meses"
              columna="Mes"
              filas={r.porMes.map((m) => ({
                clave: m.mes,
                etiqueta: mesLargo(m.mes),
                valor: m.prestamos,
              }))}
            />
          </section>
        </>
      )}
    </section>
  );
}
