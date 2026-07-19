/**
 * Clean Code note — "Don't Return Null": instead of a Server Action
 * sometimes returning data and sometimes returning null/undefined on
 * failure, it always returns one of these two shapes. The client checks
 * `result.success` — no `if (data !== null)` guessing required.
 */
export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: { message: string; code: string } };
