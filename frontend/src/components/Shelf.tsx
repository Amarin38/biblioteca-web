import { useLayoutEffect, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import type { Libro } from "../types";
import { Chevron, IconCandado, IconCheck } from "./Icons";

export type EstadoLomo = "activo" | "vencido" | "finalizado";

export interface ItemEstante {
  id: string;
  libro: Libro;
  estado?: EstadoLomo; // sin estado: libro común del catálogo
  bloqueado?: boolean; // candado: hay una multa por pagar
  multaPagada?: boolean; // devuelto después de pagar la multa
  ayuda?: string; // texto que aparece al pasar el mouse
}

const TONES = ["cuero", "burdeos", "botella", "noche", "canela", "ciruela"];
const MAX_POR_FILA = 10;

const hash = (s: string) => [...s].reduce((a, c) => a + c.charCodeAt(0), 0);
// Altura (13–17rem) estable por libro, derivada del ISBN
const altura = (isbn: string) => 13 + (hash(isbn) % 5);

// Tamaño de letra del tejuelo: los títulos largos usan hasta tres columnas y letra menor para entrar en el lomo
const tamanoTitulo = (titulo: string, isbn: string) => {
  const largo = titulo.length;
  const columnas = largo <= 14 ? 1 : largo <= 28 ? 2 : 3;
  const disponible = altura(isbn) - 7; // rem libres entre los nervios del lomo
  const porColumna = Math.ceil(largo / columnas) + 2;
  return Math.max(0.62, Math.min(0.95, disponible / (porColumna * 0.6)));
};

// Rótulo de clasificación del lomo: tres letras del género y tres del apellido del autor
const sinTildes = (t: string) =>
  t.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const rotulo = (l: Libro) => ({
  clase: sinTildes(l.genero ?? "")
    .slice(0, 3)
    .toUpperCase(),
  autor: sinTildes((l.autor ?? "").split(" ").pop() ?? "")
    .slice(0, 3)
    .toUpperCase(),
});

// Colores: vencido en rojo, finalizado en gris, el resto alterna entre las encuadernaciones
const tonoDe = (item: ItemEstante, i: number) =>
  item.estado === "vencido"
    ? "rojo"
    : item.estado === "finalizado"
      ? "gris"
      : TONES[i % TONES.length];

interface Props {
  items: ItemEstante[];
  onOpen: (item: ItemEstante, tone: string) => void;
}

interface Ayuda {
  texto: string;
  estado?: EstadoLomo;
  x: number;
  y: number;
  abajo: boolean;
}

// Dos estantes que avanzan de a un libro: la ventana de libros visibles se corre de a uno
export default function Shelf({ items, onOpen }: Props) {
  const [el, setEl] = useState<HTMLDivElement | null>(null);
  const [porFila, setPorFila] = useState(MAX_POR_FILA);
  const [offset, setOffset] = useState(0);
  const [dir, setDir] = useState(0);
  const [ayuda, setAyuda] = useState<Ayuda>();

  // Cuántos lomos entran en una fila según el ancho disponible (el CSS define el ancho de cada lomo)
  useLayoutEffect(() => {
    if (!el) return;
    const medir = () => {
      const shelf = el.querySelector<HTMLElement>(".shelf");
      const track = shelf?.querySelector<HTMLElement>(".track");
      const slot = track?.firstElementChild as HTMLElement | null;
      if (!shelf || !track || !slot) return;
      const cs = getComputedStyle(shelf);
      const interior =
        shelf.clientWidth -
        parseFloat(cs.paddingLeft) -
        parseFloat(cs.paddingRight);
      const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      const n = Math.floor((interior + gap) / (slot.offsetWidth + gap));
      setPorFila(Math.max(1, Math.min(MAX_POR_FILA, n)));
    };
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => ro.disconnect();
  }, [el]);

  const visibles = porFila * 2;
  const maxOffset = Math.max(0, items.length - visibles);
  const pos = Math.min(offset, maxOffset);

  function mover(d: number) {
    setAyuda(undefined);
    setDir(d);
    setOffset(Math.min(Math.max(pos + d, 0), maxOffset));
  }

  // La ayuda sale fuera del estante (en el body) para que el recorte del visor no la corte
  function mostrar(item: ItemEstante, el: HTMLElement) {
    if (!item.ayuda) return;
    const r = el.getBoundingClientRect();
    const abajo = r.top < 90;
    setAyuda({
      texto: item.ayuda,
      estado: item.estado,
      x: r.left + r.width / 2,
      y: abajo ? r.bottom + 10 : r.top - 10,
      abajo,
    });
  }

  // Cada fila lleva un libro extra a cada lado (recortado) para que el deslizamiento sea continuo
  const fila = (desde: number) =>
    Array.from({ length: porFila + 2 }, (_, k) => {
      const i = desde + k - 1;
      if (i < 0) return <span key={`v${k}`} className="slot" />;
      const item = items[i];
      if (!item) return null;
      const { libro } = item;
      const tone = tonoDe(item, i);
      const fantasma = k === 0 || k === porFila + 1;
      const { clase, autor } = rotulo(libro);
      return (
        <button
          key={item.id}
          className={`spine tone--${tone}${item.estado ? ` spine--${item.estado}` : ""}`}
          style={{ height: `${altura(libro.isbn)}rem` }}
          title={item.ayuda ? undefined : libro.titulo}
          aria-label={item.ayuda ? `${libro.titulo}. ${item.ayuda}` : undefined}
          aria-disabled={item.estado === "finalizado" || undefined}
          tabIndex={fantasma ? -1 : 0}
          aria-hidden={fantasma || undefined}
          onPointerEnter={(e) => mostrar(item, e.currentTarget)}
          onPointerLeave={() => setAyuda(undefined)}
          onFocus={(e) => mostrar(item, e.currentTarget)}
          onBlur={() => setAyuda(undefined)}
          onClick={() => {
            if (item.estado !== "finalizado") onOpen(item, tone);
          }}
        >
          <span
            className="spine-title"
            style={{ fontSize: `${tamanoTitulo(libro.titulo, libro.isbn)}rem` }}
          >
            {libro.titulo}
          </span>
          <span className="spine-label" aria-hidden="true">
            {clase}
            <br />
            {autor}
          </span>
          {item.bloqueado && (
            <span className="candado" aria-hidden="true">
              <IconCandado />
            </span>
          )}
          {item.multaPagada && (
            <span className="pagado" aria-hidden="true">
              <IconCheck />
            </span>
          )}
        </button>
      );
    });

  return (
    <>
      <div className="stand">
        <button
          className="page-arrow page-arrow--prev"
          aria-label="Libro anterior"
          disabled={pos === 0}
          onClick={() => mover(-1)}
        >
          <Chevron izquierda />
        </button>

        <div className="shelves" ref={setEl}>
          <span className="cartela" aria-hidden="true">
            Biblioteca
          </span>
          <span className="columna columna--izq" aria-hidden="true" />
          <span className="columna columna--der" aria-hidden="true" />
          {[pos, pos + porFila].map(
            (desde, r) =>
              (r === 0 || items.length > desde) && (
                <div className="shelf" key={r}>
                  {/* El visor muestra exactamente porFila libros; los extras quedan recortados */}
                  <div
                    className="viewport"
                    style={{ "--n": porFila } as CSSProperties}
                  >
                    <div
                      className="track"
                      key={pos}
                      style={{ "--dir": dir } as CSSProperties}
                    >
                      {fila(desde)}
                    </div>
                  </div>
                </div>
              ),
          )}
        </div>

        <button
          className="page-arrow"
          aria-label="Libro siguiente"
          disabled={pos >= maxOffset}
          onClick={() => mover(1)}
        >
          <Chevron />
        </button>
      </div>
      <p className="shelf-count">
        Mostrando {pos + 1}–{Math.min(pos + visibles, items.length)} de{" "}
        {items.length}
      </p>

      {ayuda &&
        createPortal(
          <div
            className={`ayuda${ayuda.estado ? ` ayuda--${ayuda.estado}` : ""}${ayuda.abajo ? " ayuda--abajo" : ""}`}
            style={{ left: ayuda.x, top: ayuda.y }}
            role="tooltip"
          >
            {ayuda.texto}
          </div>,
          document.body,
        )}
    </>
  );
}
