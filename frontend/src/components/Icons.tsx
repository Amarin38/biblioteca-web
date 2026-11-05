import type { ReactNode } from "react";

// Íconos de trazo: heredan el color del texto (currentColor) y se centran solos
function Icono({
  children,
  size = "1.3rem",
}: {
  children: ReactNode;
  size?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export const Chevron = ({ izquierda = false }: { izquierda?: boolean }) => (
  <Icono size="1.35rem">
    <path
      d={izquierda ? "M15.5 5l-7 7 7 7" : "M8.5 5l7 7-7 7"}
      strokeWidth="2.6"
    />
  </Icono>
);

export const IconCerrar = () => (
  <Icono size="1.2rem">
    <path d="M6 6l12 12M18 6L6 18" strokeWidth="2.4" />
  </Icono>
);

export const IconLibro = () => (
  <Icono>
    <path d="M12 6c-2-1.5-5-2-8-1.5v13c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5v-13c-3-.5-6 0-8 1.5z" />
    <path d="M12 6v13" />
  </Icono>
);

export const IconEjemplares = () => (
  <Icono>
    <rect x="3" y="15" width="18" height="4" rx="1" />
    <rect x="5" y="10" width="15" height="4" rx="1" />
    <rect x="4" y="5" width="16" height="4" rx="1" />
  </Icono>
);

export const IconReloj = () => (
  <Icono>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </Icono>
);

export const IconAlerta = () => (
  <Icono>
    <path d="M12 4l9 16H3z" />
    <path d="M12 10v4M12 17.2v.1" />
  </Icono>
);

export const IconPdf = () => (
  <Icono size="1.1rem">
    <path d="M7 3h7l5 5v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
    <path d="M14 3v5h5M9 13h6M9 17h6" />
  </Icono>
);

export const IconExterno = () => (
  <Icono size="1rem">
    <path d="M14 4h6v6M20 4l-9 9" />
    <path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
  </Icono>
);

export const IconCandado = () => (
  <Icono size="1.05rem">
    <rect x="5" y="11" width="14" height="9" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3M12 15v2" />
  </Icono>
);

export const IconCheck = () => (
  <Icono size="1rem">
    <path d="M5 12.5l4.5 4.5L19 7.5" strokeWidth="2.6" />
  </Icono>
);
