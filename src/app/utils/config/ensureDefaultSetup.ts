import { AppService } from "@/app/services/app.service";
import type { Account, User as NextAuthUser } from "next-auth";

export async function ensureDefaultSetup(
  user: NextAuthUser,
  account: Account | null,
) {
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
    console.error("[NextAuth] Failed to create default setup:", error);
    return false; // setup fail ရင် sign-in ကို block — data ညစ်ပတ်စေချင်လို့ မဟုတ်
  }
}
