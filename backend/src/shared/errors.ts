// ---------- Clases base ----------
export class AppError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export class BadRequestError extends AppError {
  constructor(msg = "Petición inválida") {
    super(msg, 400);
  }
}

export class UnauthorizedError extends AppError {
  constructor(msg = "No autorizado") {
    super(msg, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(msg = "Acceso denegado") {
    super(msg, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(msg = "Recurso no encontrado") {
    super(msg, 404);
  }
}

export class ConflictError extends AppError {
  constructor(msg = "Conflicto") {
    super(msg, 409);
  }
}

export class TooManyRequestsError extends AppError {
  constructor(msg = "Demasiadas solicitudes") {
    super(msg, 429);
  }
}

export const errores = {
  general: {
    validacion: (detalle: string) => new BadRequestError(detalle),
    rutaNoEncontrada: () => new NotFoundError("Ruta no encontrada."),
  },

  auth: {
    sinSesion: () => new UnauthorizedError("Necesitás iniciar sesión"),
    credenciales: () => new UnauthorizedError("Email o contraseña incorrectos"),
    soloAdmin: () => new ForbiddenError("Solo para administradores"),
    prestamoAjeno: () =>
      new ForbiddenError("Solo podés acceder a tus propios préstamos"),
    usuarioAjeno: () =>
      new ForbiddenError("Solo podés acceder a tu propio usuario"),
    sinPrestamoParaPdf: () =>
      new ForbiddenError(
        "Para leer este libro tenés que registrar el préstamo",
      ),
    demasiadosIntentos: () =>
      new TooManyRequestsError(
        "Demasiados intentos. Probá de nuevo en unos minutos",
      ),
    cuentaExistente: () =>
      new ConflictError("Ya existe una cuenta con ese email"),
  },

  libro: {
    noExiste: (isbn: string) =>
      new NotFoundError(`No existe el libro con el isbn ${isbn}`),
    yaExiste: (isbn: string) =>
      new ConflictError(`Ya existe un libro con el isbn ${isbn}`),
    conEjemplares: (isbn: string, titulo: string) =>
      new ConflictError(
        `No se puede eliminar el libro (${isbn}) ${titulo}, ya que sigue teniendo ejemplares.`,
      ),
    sinCambios: () => new BadRequestError("Se debe enviar titulo o sinopsis"),
    sinPdf: (titulo: string) =>
      new NotFoundError(`El libro ${titulo} no tiene PDF disponible`),
  },

  ejemplar: {
    noExiste: (codigo: string) =>
      new NotFoundError(`No existe el ejemplar ${codigo}`),
    yaExiste: (codigo: string) =>
      new ConflictError(`Ya existe un ejemplar con el código ${codigo}`),
    conPrestamoActivo: (codigo: string) =>
      new ConflictError(`El ejemplar ${codigo} tiene un préstamo activo`),
    noEstaDeBaja: (codigo: string) =>
      new ConflictError(`El ejemplar ${codigo} no está dado de baja`),
    noSePuedeDarDeBaja: (codigo: string) =>
      new ConflictError(
        `El ejemplar ${codigo} tiene préstamos registrados: pasalo a estado "baja" para eliminarlo junto con su historial`,
      ),
  },

  usuario: {
    noExiste: (id: number) =>
      new NotFoundError(`No existe el usuario con el id ${id}`),
    noExistePorEmail: (email: string) =>
      new NotFoundError(`No existe el usuario con el email ${email}`),
    emailRegistrado: (email: string) =>
      new ConflictError(`El email ${email} ya está registrado`),
    conPrestamosActivos: (nombre: string) =>
      new ConflictError(
        `El usuario ${nombre} tiene préstamos activos y no puede ser eliminado.`,
      ),
    conPrestamos: (nombre: string) =>
      new ConflictError(
        `El usuario ${nombre} tiene préstamos registrados: eliminá primero esos préstamos.`,
      ),
  },

  prestamo: {
    noExiste: (id: number) =>
      new NotFoundError(`No existe el préstamo con el id ${id}`),
    ejemploNoDisponible: (codigo: string) =>
      new ConflictError(`El ejemplar ${codigo} no está disponible`),
    yaFinalizado: (id: number) =>
      new ConflictError(`El préstamo ${id} ya está finalizado`),
    activo: (id: number) => new ConflictError(`El préstamo ${id} sigue activo`),
    noRenovable: () =>
      new ConflictError(
        "El préstamo no se puede renovar: no está activo, está vencido o llegó al máximo de renovaciones",
      ),
    sinMulta: () => new ConflictError("El préstamo no tiene multa pendiente"),
    montoExcedeSaldo: () =>
      new BadRequestError("El monto es mayor al saldo de la multa"),
    noDisponible: (idEjemplar: string, estado: string) =>
      new ConflictError(`El ejemplar ${idEjemplar} está ${estado}`),
    noActivo: () => new ConflictError("Solo se renuevan préstamos activos"),
    yaDevuelto: () => new ConflictError("El préstamo ya fue devuelto"),
    limite: () => new ConflictError("Límite de renovaciones alcanzado"),
  },
};
