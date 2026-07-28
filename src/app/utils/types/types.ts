import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: number | null;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      companyId: number | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    companyId?: number | null;
  }
}
