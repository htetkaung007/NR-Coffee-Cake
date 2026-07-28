/** Plain, serializable shape of an error — safe to send to the client. */
export type ErrorInfo = { message: string; code: string };

/**
 * Base class for errors that are SAFE to show directly to the client.
 *
 * Clean Code note — "Define Exception Classes in Terms of a Caller's Needs":
 * we split errors into two groups instead of leaking every internal detail.
 *   1. AppError (and subclasses) → expected, caller needs the message.
 *   2. Anything else (Prisma errors, network errors, bugs) → unexpected,
 *      the caller only needs to know "something failed", not why.
 */
export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

/**
 * Thrown when a record doesn't exist.
 *
 * Clean Code note — "Provide Context with Exceptions": the message always
 * carries WHAT was missing and WHICH id was looked up, so logs and error
 * screens are useful instead of a bare "Not found".
 */
export class NotFoundError extends AppError {
  constructor(entity: string, identifier: string | number) {
    super(`${entity} not found (id: ${identifier})`, "NOT_FOUND");
    this.name = "NotFoundError";
  }
}

/** Thrown when input from the client fails a business rule. */
export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, "VALIDATION_ERROR");
    this.name = "ValidationError";
  }
}
export class InsufficientStockError extends AppError {
  constructor(menuId: number, locationId: number) {
    super(
      `Not enough stock for menu ${menuId} at location ${locationId}`,
      "INSUFFICIENT_STOCK",
    );
    this.name = "InsufficientStockError";
  }
}
