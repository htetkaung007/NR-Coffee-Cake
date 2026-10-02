import { defineConfig } from "vitest/config";

export default defineConfig({
  // Resolves the "@/app/..." alias from tsconfig.json's `paths` (built into
  // Vite), so tests import modules exactly the way the app does.
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    exclude: ["node_modules/**", ".next/**", "prisma/generated/**"],
    env: {
      // Pins the shop timezone (utils/config falls back to it too) so a
      // SHOP_TIMEZONE in a developer's own environment can't change what
      // the shop-day tests check.
      SHOP_TIMEZONE: "Asia/Yangon",
    },
  },
});
