// src/app/components/Providers.tsx
"use client";

import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import { SessionProvider } from "next-auth/react";
import { ThemeModeProvider } from "../lib/theme/ThemeModeProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AppRouterCacheProvider>
      <SessionProvider>
        <ThemeModeProvider>{children}</ThemeModeProvider>
      </SessionProvider>
    </AppRouterCacheProvider>
  );
}
