import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";

import { ensureDefaultSetup } from "./ensureDefaultSetup";
import { loginSchema } from "@/app/lib/schemas/authSchema";
import { AppService } from "@/app/services";

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
      // Sign-in ချိန်မှာပဲ companyId ကို token ထဲ ထည့်ထား — request တိုင်း
      // database ကို ပြန်မထိုးတော့ဘဲ token (encrypted cookie) ထဲကနေပဲ ဖတ်.
      if (user?.email) {
        const company = await AppService.getCompanyByEmail(user.email);
        token.companyId = company.id;

        // Prisma User.id (number) ကို token ထဲ cache — Google OAuth ရဲ့
        // user.id ဟာ Google ကိုယ်ပိုင် account id ဖြစ်လို့ (Rule 9),
        // email ကနေပဲ ပြန်ရှာရတယ်.
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
        session.user.role =
          (token.role as "ADMIN" | "MANAGER" | undefined) ?? "ADMIN";
      }
      return session;
    },
  },

  pages: {
    signIn: "/auth/signIn",
  },
};
