import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";

import { ensureDefaultSetup } from "./ensureDefaultSetup";
import { loginSchema } from "@/app/lib/schemas/authSchema";
import { AppService, CompanyService } from "@/app/services";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },

  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),

    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        // Boundary validate first — invalid shape (bad email format, empty
        // password) never even reaches the database.
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        // Actual check/approve decision lives in the Service layer, same
        // as registerUser — authorize() itself stays thin.
        const user = await AppService.verifyCredentials(
          parsed.data.email,
          parsed.data.password,
        );
        if (!user) return null;

        return {
          id: String(user.id),
          email: user.email,
          name: user.name ?? undefined,
        };
      },
    }),
  ],

  callbacks: {
    async signIn({ user, account }) {
      return ensureDefaultSetup(user, account);
    },

    async jwt({ token, user }) {
      // Cache companyId in the token at sign-in, so each request reads it
      // from the (encrypted) cookie instead of the database.
      if (user?.email) {
        const company = await CompanyService.getByUserEmail(user.email);
        token.companyId = company.id;

        // Cache our Prisma User.id, looked up by email: Google OAuth's
        // user.id is Google's own account id (CLAUDE.md §9).
        const dbUser = await AppService.getUserByEmail(user.email);
        if (dbUser) {
          token.userId = dbUser.id;
          token.role = dbUser.role;
        }
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.companyId = (token.companyId as number | null) ?? null;
        session.user.id = (token.userId as number | null) ?? null;
        // Least-privilege fallback — only fires when the role is missing
        // (no session, stale pre-role cookie, lookup failure); real roles
        // come from the DB via the jwt callback.
        session.user.role =
          (token.role as "ADMIN" | "MANAGER" | undefined) ?? "MANAGER";
      }
      return session;
    },
  },

  pages: {
    signIn: "/auth/signIn",
  },
};
