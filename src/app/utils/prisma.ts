import { PrismaClient } from "../../../prisma/generated/client";
//for all paltform we can use globalThis to store the prisma client instance
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};
//if the prisma client instance is not defined then create a new instance of prisma client
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development" ? ["query", "error"] : ["error"],
    /*  accelerateUrl: process.env.PRISMA_ACCELERATE_URL ?? "", */ //I've changed accelerateUrl?: never;
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
