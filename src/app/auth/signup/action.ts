"use server";

import {
  toActionResult,
  toSafeResult,
  validateWith,
} from "@/app/lib/actionHelper";
import { registerSchema } from "@/app/lib/schemas/authSchema";
import { AppService } from "@/app/services/app.service";

// AppService.registerUser ကိုယ်တိုင်က email-already-exists check +
// bcrypt hash + createDefaultSetup transaction — အားလုံးကို ကိုင်တွယ်ပေးတယ်.
// ဒီ action.ts ကတော့ boundary validate ပြီး ခေါ်ရုံပါပဲ.
const safeRegisterUser = toSafeResult(AppService.registerUser);

export async function registerAction(rawInput: unknown) {
  const result = await validateWith(registerSchema, rawInput).asyncAndThen(
    safeRegisterUser,
  );
  return toActionResult(result);
}
