import { useEffect, useId, useRef, type ReactNode } from "react";

// Ventana modal con el elemento <dialog> nativo: el navegador se ocupa del foco, de Escape y del fondo.
export default function Dialogo({
  titulo,
  onCerrar,
  children,
}: {
  titulo: string;
  onCerrar: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();

  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      className="dialogo"
      aria-labelledby={id}
      onClose={onCerrar}
      // un clic sobre el fondo (el propio <dialog>, no su contenido) cierra la ventana
      onClick={(e) => e.target === ref.current && ref.current?.close()}
    >
      <div className="dialogo-cuerpo">
        <h2 id={id}>{titulo}</h2>
        {children}
      </div>
    </dialog>
  );
}
