import { ok, err, ResultAsync, type Result } from "neverthrow";
import type { ZodType } from "zod";
import { AppError, type ErrorInfo } from "./errors";
import { ActionResult } from "./actionResult";
/**
 * Wraps a Service function that throws into one that returns
 * ResultAsync<T, ErrorInfo>: an AppError keeps its message, anything
 * else is logged and becomes a generic error.
 */
export function toSafeResult<Args extends unknown[], SuccessValue>(
  serviceFn: (...args: Args) => Promise<SuccessValue>,
) {
  return (...args: Args): ResultAsync<SuccessValue, ErrorInfo> =>
    ResultAsync.fromPromise(serviceFn(...args), (error): ErrorInfo => {
      if (error instanceof AppError) {
        return error.params
          ? { message: error.message, code: error.code, params: error.params }
          : { message: error.message, code: error.code };
      }
      console.error("[ServerAction] Unhandled error:", error);
      return {
        message: "Something went wrong. Please try again.",
        code: "INTERNAL_ERROR",
      };
    });
}

/** Flattens a Result into the plain object sent to the client
 *  ({ success, data } / { success, error }). */
export function toActionResult<SuccessValue>(
  result: Result<SuccessValue, ErrorInfo>,
): ActionResult<SuccessValue> {
  return result.match(
    (data) => ({ success: true, data }),
    (error) => ({ success: false, error }),
  );
}

//input from client and validate it with zod schema, return Result<T, ErrorInfo>
export function validateWith<T>(
  schema: ZodType<T>,
  rawInput: unknown,
): Result<T, ErrorInfo> {
  const parsed = schema.safeParse(rawInput);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return err({
      message: firstIssue?.message ?? "Invalid input.",
      code: "VALIDATION_ERROR",
    });
  }
  return ok(parsed.data);
}
