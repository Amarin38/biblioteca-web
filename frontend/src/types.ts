// Ajustar a los modelos reales del backend
export type EstadoEjemplar = "disponible" | "prestado" | "baja";
export type EstadoPrestamo = "activo" | "vencido" | "finalizado";

export interface Libro {
  isbn: string;
  titulo: string;
  autor: string;
  genero: string;
  sinopsis?: string | null;
  fechaLanzamiento?: string;
}
export interface Ejemplar {
  codigoBarras: string;
  isbn: string;
  estado: EstadoEjemplar;
}
export interface Usuario {
  idUsuario: number;
  nombre: string;
  email: string;
  tipo: string;
  admin?: boolean;
}
export interface Prestamo {
  idPrestamo: number;
  idUsuario: number;
  idEjemplar: string; // código de barras del ejemplar
  fechaInicio: string;
  fechaVencimiento?: string;
  fechaDevolucion: string;
  estado: EstadoPrestamo;
  renovaciones: number;
}
export interface Multa {
  diasAtraso: number;
  monto: number;
  pagado: number;
  saldo: number;
}
export interface Reporte {
  generadoEn: string;
  libros: number;
  usuarios: number;
  ejemplares: {
    disponible: number;
    prestado: number;
    baja: number;
    total: number;
  };
  prestamos: {
    activo: number;
    vencido: number;
    finalizado: number;
    total: number;
  };
  multasCobradas: number;
  masPrestados: {
    isbn: string;
    titulo: string;
    autor: string;
    prestamos: number;
  }[];
  porGenero: { genero: string; prestamos: number }[];
  porMes: { mes: string; prestamos: number }[];
}
export interface Pago {
  idPago: number;
  monto: number;
  fecha: string;
}
