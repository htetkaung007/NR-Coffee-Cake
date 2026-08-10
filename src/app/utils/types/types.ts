import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      name?: string | null;
      email?: string | null;
      image?: string | null;
      companyId: number | null;
      id: number | null;
      role: "ADMIN" | "MANAGER";
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    companyId?: number | null;
    userId?: number | null;
    role?: "ADMIN" | "MANAGER";
  }
}
