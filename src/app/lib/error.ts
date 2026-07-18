export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class NotFoundError extends AppError {
  constructor(
    entity: string,
    public readonly identifier: string | number,
  ) {
    super(`${entity} not found (id: ${identifier})`, "NOT_FOUND");
    this.name = "NotFoundError";
  }
}

export class ValidationError extends AppError {
  constructor(
    message: string,
    public readonly field: string,
  ) {
    super(message, "VALIDATION_ERROR");
    this.name = "ValidationError";
  }
}
