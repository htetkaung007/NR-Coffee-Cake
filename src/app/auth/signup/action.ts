"use server";

import {
  toActionResult,
  toSafeResult,
  validateWith,
} from "@/app/lib/actionHelper";
import { registerSchema } from "@/app/lib/schemas/authSchema";
import { AppService } from "@/app/services";

const safeRegisterUser = toSafeResult(AppService.registerUser);

export async function registerAction(rawInput: unknown) {
  const result = await validateWith(registerSchema, rawInput).asyncAndThen(
    safeRegisterUser,
  );
  return toActionResult(result);
}
