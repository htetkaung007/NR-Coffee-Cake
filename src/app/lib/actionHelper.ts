import { ok, err, ResultAsync, type Result } from "neverthrow";
import type { ZodType } from "zod";
import { AppError, type ErrorInfo } from "./errors";
import { ActionResult } from "./actionResult";
/**
 * toSafeResult — Service function ကို throw မလုပ်တော့ဘဲ
 * ResultAsync<T, ErrorInfo> ပြန်ပေးတဲ့ version ပြောင်းပေးတယ်.
 *
 * app/backoffice/**\/action.ts file တိုင်း ဒါကို ပြန်သုံးရမှာမို့
 * တစ်နေရာတည်း (lib/) ထားထားတယ် — DRY.
 */
export function toSafeResult<Args extends unknown[], SuccessValue>(
  serviceFn: (...args: Args) => Promise<SuccessValue>,
) {
  return (...args: Args): ResultAsync<SuccessValue, ErrorInfo> =>
    ResultAsync.fromPromise(serviceFn(...args), (error): ErrorInfo => {
      if (error instanceof AppError) {
        return { message: error.message, code: error.code };
      }
      console.error("[ServerAction] Unhandled error:", error);
      return {
        message: "Something went wrong. Please try again.",
        code: "INTERNAL_ERROR",
      };
    });
}

/** Result/ResultAsync ကို client ဆီ ပို့မယ့် plain object ({success, data}/{success, error}) ပြောင်းတယ်. */
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
function isErrorInfo(value: unknown): value is ErrorInfo {
  return (
    typeof value === "object" &&
    value !== null &&
    "message" in value &&
    "code" in value
  );
}
