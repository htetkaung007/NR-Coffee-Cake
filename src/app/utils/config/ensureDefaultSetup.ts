import { AppService } from "@/app/services";
import { AppError } from "@/app/lib/errors";
import { SIGNUP_CLOSED_URL } from "@/app/lib/access/signUp";
import type { Account, User as NextAuthUser } from "next-auth";

/** NextAuth's signIn callback: true lets the sign-in through, false
 *  blocks it, a URL redirects there instead. An existing user signs in
 *  as always; a new Google email creates the shop only while sign-up is
 *  open (single-shop mode — AppService.createDefaultSetup refuses with
 *  SIGNUP_CLOSED otherwise, and nothing is created). */
export async function ensureDefaultSetup(
  user: NextAuthUser,
  account: Account | null,
): Promise<boolean | string> {
  if (!user.email) return false;

  const existingUser = await AppService.getUserByEmail(user.email);
  if (existingUser) return true; // ရှိပြီးသား user, ဆက်ဝင်ပါ

  if (account?.provider === "credentials") {
    return false;
  }

  try {
    await AppService.createDefaultSetup({ name: user.name, email: user.email });
    return true;
  } catch (error) {
    // Never log the email: it's a stranger's address, not our user's.
    if (error instanceof AppError && error.code === "SIGNUP_CLOSED") {
      return SIGNUP_CLOSED_URL;
    }
    console.error("[NextAuth] Failed to create default setup:", error);
    return false; // setup fail ရင် sign-in ကို block — data ညစ်ပတ်စေချင်လို့ မဟုတ်
  }
}
