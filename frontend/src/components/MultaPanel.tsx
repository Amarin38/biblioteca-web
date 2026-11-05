import { useEffect, useState } from "react";
import { fecha } from "../format";
import type { Multa } from "../types";
import { IconCandado } from "./Icons";

interface Props {
  titulo: string;
  vencio?: string;
  multa?: Multa | null; // null: no se pudo consultar
  onPagar: (monto: number) => Promise<string | undefined>; // devuelve el mensaje de error, si falla
  onClose: () => void;
}

const pesos = (n: number) => `$ ${n.toLocaleString("es-AR")}`;

// Aviso de un libro bloqueado: muestra la multa y permite pagarla
export default function MultaPanel({
  titulo,
  vencio,
  multa,
  onPagar,
  onClose,
}: Props) {
  const [error, setError] = useState<string>();
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function pagar() {
    if (!multa) return;
    setError(undefined);
    setEnviando(true);
    const fallo = await onPagar(multa.saldo);
    setEnviando(false);
    if (fallo) setError(fallo);
  }

  return (
    <div className="overlay" onClick={onClose}>
      <section
        className="multa"
        role="dialog"
        aria-modal="true"
        aria-label="Libro bloqueado"
        onClick={(e) => e.stopPropagation()}
      >
        <header>
          <span className="multa-candado">
            <IconCandado />
          </span>
          <h2>Libro bloqueado</h2>
        </header>
        <p>
          «{titulo}» venció el {fecha(vencio)}. Tenés que pagar la multa por el
          atraso: al pagarla, el libro se da de baja y ya no vas a poder leerlo.
        </p>

        {multa ? (
          <dl className="info">
            <div>
              <dt>Días de atraso</dt>
              <dd>{multa.diasAtraso}</dd>
            </div>
            <div>
              <dt>Multa</dt>
              <dd>{pesos(multa.monto)}</dd>
            </div>
            <div>
              <dt>Pagado</dt>
              <dd>{pesos(multa.pagado)}</dd>
            </div>
            <div>
              <dt>Saldo a pagar</dt>
              <dd>
                <strong>{pesos(multa.saldo)}</strong>
              </dd>
            </div>
          </dl>
        ) : (
          <p className="multa-aviso">
            No se pudo consultar el monto de la multa. Acercate al mostrador de
            la biblioteca.
          </p>
        )}

        {error && (
          <p role="alert" className="multa-aviso">
            {error}
          </p>
        )}

        <div className="multa-botones">
          {multa && (
            <button disabled={enviando} onClick={pagar}>
              {multa.saldo > 0
                ? `Pagar ${pesos(multa.saldo)} y dar de baja`
                : "Dar de baja"}
            </button>
          )}
          <button className="btn-cerrar" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </section>
    </div>
  );
}
