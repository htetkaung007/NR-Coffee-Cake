import { getServerSession } from "next-auth";
import { authOptions } from "@/app/utils/config/authOptions";

/**
 * Every Server Component or action that needs the signed-in user's
 * companyId + userId calls this instead of repeating the session lookup
 * at the top of every file. Kept in lib/, not services/ — reading the
 * session is a Controller-layer concern (Rule 1: Services must not
 * depend on NextAuth), even though it's shared across many Controllers.
 */
export async function getSessionContext() {
  const session = await getServerSession(authOptions);
  return {
    companyId: session?.user?.companyId ?? null,
    userId: session?.user?.id ?? null,
    // Least-privilege fallback — only fires when the role is missing
    // (no session, stale pre-role cookie, lookup failure); real roles
    // come from the DB via the jwt callback.
    role: session?.user?.role ?? "MANAGER",
  };
}
