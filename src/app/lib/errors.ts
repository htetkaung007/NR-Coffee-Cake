/** Values a customer screen puts into its translated message for this
 *  error (errors.<code> in messages/*.json) — names and counts only,
 *  never ids or tokens. */
export type ErrorParams = Record<string, string | number>;

/** Plain, serializable shape of an error — safe to send to the client.
 *  `params` only when the error has any (customer screens translate by
 *  `code`, lib/i18n/errorMessage). */
export type ErrorInfo = { message: string; code: string; params?: ErrorParams };

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
    /** For the customer's translated message (errors.<code>). */
    public readonly params?: ErrorParams,
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
  /** `code` NOT_FOUND unless a customer screen needs a specific one
   *  (e.g. DRAFT_NOT_FOUND) — the message (with its id) is for logs and
   *  staff; customers see their translated errors.<code> instead. */
  constructor(entity: string, identifier: string | number, code = "NOT_FOUND") {
    super(`${entity} not found (id: ${identifier})`, code);
    this.name = "NotFoundError";
  }
}

/** Thrown when input from the client fails a business rule. */
export class ValidationError extends AppError {
  /** `code` VALIDATION_ERROR unless a customer screen needs a specific,
   *  stable one (e.g. DRAFT_NOT_YOURS) — the English message is
   *  unchanged either way. */
  constructor(message: string, code = "VALIDATION_ERROR", params?: ErrorParams) {
    super(message, code, params);
    this.name = "ValidationError";
  }
}
export class InsufficientStockError extends AppError {
  constructor(menuName: string, available: number) {
    super(
      available > 0
        ? `Only ${available} ${menuName} left — please adjust the quantity.`
        : `${menuName} just sold out.`,
      available > 0 ? "LOW_STOCK" : "OUT_OF_STOCK",
      available > 0 ? { name: menuName, count: available } : { name: menuName },
    );
    this.name = "InsufficientStockError";
  }
}
