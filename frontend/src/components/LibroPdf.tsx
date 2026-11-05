import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import * as pdfjs from "pdfjs-dist";
import type { PDFDocumentProxy } from "pdfjs-dist";
// El worker se empaqueta como un .js propio (con "?worker"): así no depende de cómo el servidor sirva los .mjs
import PdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?worker";
import { abrirEnPestana, cabecerasPdf } from "../api/pdf";
import { Chevron } from "./Icons";

pdfjs.GlobalWorkerOptions.workerPort = new PdfWorker();

const DURACION = 700; // ms que tarda en pasar una hoja
const MAX_EN_MEMORIA = 40; // páginas ya dibujadas que se conservan

type Sentido = "adelante" | "atras";
interface Giro {
  dir: Sentido;
  desde: number;
  hacia: number;
}

// Dibuja una página del PDF y la devuelve como imagen
async function dibujar(doc: PDFDocumentProxy, n: number, alto: number) {
  const page = await doc.getPage(n);
  const base = page.getViewport({ scale: 1 });
  const viewport = page.getViewport({ scale: alto / base.height });
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Sin canvas");
  await page.render({
    canvas,
    canvasContext: ctx,
    viewport,
    background: "#ffffff",
  }).promise;
  page.cleanup();
  return canvas.toDataURL("image/jpeg", 0.9);
}

// Conserva solo las páginas más cercanas a la que se está leyendo
function podar(mapa: Map<number, string>, centro: number) {
  if (mapa.size <= MAX_EN_MEMORIA) return;
  [...mapa.keys()]
    .sort((a, b) => Math.abs(b - centro) - Math.abs(a - centro))
    .slice(0, mapa.size - MAX_EN_MEMORIA)
    .forEach((k) => mapa.delete(k));
}

// El PDF como un libro: dos páginas enfrentadas que se pasan con una hoja que gira sobre el lomo
export default function LibroPdf({ url }: { url: string }) {
  const zona = useRef<HTMLDivElement>(null);
  const imagenes = useRef(new Map<number, string>());
  const temporizador = useRef<number | undefined>(undefined);
  const [doc, setDoc] = useState<PDFDocumentProxy>();
  const [fallo, setFallo] = useState<string>();
  const [proporcion, setProporcion] = useState(0.707); // ancho / alto de una página
  const [medida, setMedida] = useState({ ancho: 0, alto: 0 });
  const [pagina, setPagina] = useState(1);
  const [giro, setGiro] = useState<Giro>();
  const [, setVersion] = useState(0);

  const total = doc?.numPages ?? 0;
  const doble = medida.ancho >= 640;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  // Tamaño de cada página: la mayor que entra en la zona sin deformarse
  const ph = Math.floor(
    Math.max(
      120,
      Math.min(
        medida.alto - 44,
        (medida.ancho - 48) / (doble ? 2 : 1) / proporcion,
      ),
    ),
  );
  const pw = Math.floor(ph * proporcion);
  const cubeta = Math.max(200, Math.round((ph * dpr) / 100) * 100);

  // Páginas de cada pliego: el primero muestra solo la portada, a la derecha
  const ultimo = Math.floor(total / 2);
  const espiga = doble ? Math.min(Math.floor(pagina / 2), ultimo) : 0;
  const izq = (s: number) => (s === 0 ? 0 : 2 * s);
  const der = (s: number) => (2 * s + 1 <= total ? 2 * s + 1 : 0);

  // Abre el PDF
  useEffect(() => {
    let cancelado = false;
    const tarea = pdfjs.getDocument({ url, httpHeaders: cabecerasPdf() });
    tarea.promise
      .then(async (d) => {
        const primera = await d.getPage(1);
        const v = primera.getViewport({ scale: 1 });
        if (cancelado) return;
        setProporcion(v.width / v.height);
        setDoc(d);
      })
      .catch((e: unknown) => {
        if (!cancelado)
          setFallo(e instanceof Error ? e.message : "Error desconocido");
      });
    return () => {
      cancelado = true;
      void tarea.destroy();
    };
  }, [url]);

  // Mide la zona disponible
  useEffect(() => {
    const el = zona.current;
    if (!el) return;
    const medir = () =>
      setMedida({ ancho: el.clientWidth, alto: el.clientHeight });
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Si cambia el tamaño de página, las imágenes viejas ya no sirven
  useEffect(() => {
    imagenes.current.clear();
    setVersion((v) => v + 1);
  }, [cubeta]);

  // Páginas que hay que tener dibujadas: las que se ven y las vecinas
  const necesarias = useMemo(() => {
    const lista: number[] = [];
    const sumar = (n: number) => {
      if (n >= 1 && n <= total && !lista.includes(n)) lista.push(n);
    };
    if (doble) {
      for (const s of [espiga, espiga + 1, espiga - 1, espiga + 2]) {
        if (s < 0) continue;
        sumar(s === 0 ? 0 : 2 * s);
        sumar(2 * s + 1);
      }
    } else {
      for (const d of [0, 1, -1, 2]) sumar(pagina + d);
    }
    return lista;
  }, [doble, espiga, pagina, total]);

  useEffect(() => {
    if (!doc || !ph) return;
    let cancelado = false;
    (async () => {
      for (const n of necesarias) {
        if (cancelado) return;
        if (imagenes.current.has(n)) continue;
        try {
          const img = await dibujar(doc, n, cubeta);
          if (cancelado) return;
          imagenes.current.set(n, img);
          podar(imagenes.current, pagina);
          setVersion((v) => v + 1);
        } catch {
          /* una página que no se puede dibujar no frena a las demás */
        }
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [doc, cubeta, necesarias, pagina, ph]);

  const reducido = useMemo(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );

  function ir(dir: Sentido) {
    if (giro || !total) return;
    if (!doble) {
      setPagina((p) =>
        Math.min(total, Math.max(1, p + (dir === "adelante" ? 1 : -1))),
      );
      return;
    }
    const hacia = espiga + (dir === "adelante" ? 1 : -1);
    if (hacia < 0 || hacia > ultimo) return;
    const nueva = hacia === 0 ? 1 : 2 * hacia;
    if (reducido) {
      setPagina(nueva);
      return;
    }
    setGiro({ dir, desde: espiga, hacia });
    temporizador.current = window.setTimeout(() => {
      setPagina(nueva);
      setGiro(undefined);
    }, DURACION);
  }

  // Flechas del teclado
  const irRef = useRef(ir);
  irRef.current = ir;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      e.preventDefault();
      irRef.current(e.key === "ArrowRight" ? "adelante" : "atras");
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(temporizador.current);
    };
  }, []);

  // Qué página va en cada lugar mientras una hoja está girando
  const baseIzq = giro
    ? izq(giro.dir === "adelante" ? giro.desde : giro.hacia)
    : izq(espiga);
  const baseDer = giro
    ? der(giro.dir === "adelante" ? giro.hacia : giro.desde)
    : der(espiga);
  const frente = giro
    ? der(giro.dir === "adelante" ? giro.desde : giro.hacia)
    : 0;
  const dorso = giro
    ? izq(giro.dir === "adelante" ? giro.hacia : giro.desde)
    : 0;

  // Contenido de una página: la guarda del libro (n = 0), la imagen o un aviso mientras se dibuja
  const pagina_ = (n: number) => {
    if (n === 0) return <div className="lb-guarda" />;
    const img = imagenes.current.get(n);
    return img ? (
      <img src={img} alt={`Página ${n}`} draggable={false} />
    ) : (
      <div className="lb-carga">Cargando…</div>
    );
  };

  const alInicio = doble ? espiga === 0 : pagina <= 1;
  const alFinal = doble ? espiga >= ultimo : pagina >= total;
  const leyenda = !total
    ? ""
    : doble
      ? der(espiga) && izq(espiga)
        ? `Páginas ${izq(espiga)}–${der(espiga)} de ${total}`
        : `Página ${der(espiga) || izq(espiga)} de ${total}`
      : `Página ${pagina} de ${total}`;
  const estilo = { "--pw": `${pw}px`, "--ph": `${ph}px` } as CSSProperties;

  return (
    <div className="lb">
      <div className="lb-zona" ref={zona}>
        {fallo !== undefined && (
          <p className="lector-aviso">
            No se pudo abrir el PDF como libro.{" "}
            <button className="link" onClick={() => void abrirEnPestana(url)}>
              Abrirlo en otra pestaña
            </button>
            <small className="lector-detalle">{fallo}</small>
          </p>
        )}
        {!doc && fallo === undefined && (
          <p className="lector-aviso">Abriendo el libro…</p>
        )}

        {doc && ph > 0 && doble && (
          <div className="lb-cuerpo" style={estilo}>
            <div className="lb-base lb-base--izq" onClick={() => ir("atras")}>
              {pagina_(baseIzq)}
            </div>
            <div
              className="lb-base lb-base--der"
              onClick={() => ir("adelante")}
            >
              {pagina_(baseDer)}
            </div>
            {giro && (
              <div className={`lb-hoja lb-hoja--${giro.dir}`}>
                <div className="lb-cara lb-cara--frente">{pagina_(frente)}</div>
                <div className="lb-cara lb-cara--dorso">{pagina_(dorso)}</div>
              </div>
            )}
          </div>
        )}

        {doc && ph > 0 && !doble && (
          <div className="lb-cuerpo lb-cuerpo--simple" style={estilo}>
            <div className="lb-base lb-base--simple" key={pagina}>
              {pagina_(pagina)}
            </div>
          </div>
        )}
      </div>

      {total > 0 && (
        <div className="lb-control">
          <button
            className="page-arrow"
            aria-label="Página anterior"
            disabled={alInicio || !!giro}
            onClick={() => ir("atras")}
          >
            <Chevron izquierda />
          </button>
          <span>{leyenda}</span>
          <button
            className="page-arrow"
            aria-label="Página siguiente"
            disabled={alFinal || !!giro}
            onClick={() => ir("adelante")}
          >
            <Chevron />
          </button>
        </div>
      )}
    </div>
  );
}
