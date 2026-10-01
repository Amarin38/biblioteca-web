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
