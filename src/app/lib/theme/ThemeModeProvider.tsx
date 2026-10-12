"use client";

import { createContext, useContext, useMemo, useState } from "react";
import { ThemeProvider, CssBaseline } from "@mui/material";
import type { PaletteMode } from "@mui/material";
import { getBoTheme } from "./theme";
import { getOdTheme } from "./odTheme";

type ThemeModeContextValue = {
  mode: PaletteMode;
  toggleMode: () => void;
};

const ThemeModeContext = createContext<ThemeModeContextValue | null>(null);

const STORAGE_KEY = "theme-mode";

// A Server Component layout can't pass a function to a Client Component
// (it can't be serialized), so it passes a string key, resolved here.
const THEME_BUILDERS = {
  bo: getBoTheme,
  od: getOdTheme,
} as const;

export type ThemeSurface = keyof typeof THEME_BUILDERS;

/** Holds only the light/dark mode and its toggle — one for the whole app,
 *  mounted by the root layout. SurfaceThemeProvider builds each surface's
 *  theme object. */
export function ThemeModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<PaletteMode>(() => {
    if (typeof window === "undefined") {
      return "light";
    }

    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "light" || saved === "dark") {
      return saved;
    }

    return "light";
  });

  const toggleMode = () => {
    setMode((prev) => {
      const next = prev === "light" ? "dark" : "light";
      window.localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  };

  return (
    <ThemeModeContext.Provider value={{ mode, toggleMode }}>
      {children}
    </ThemeModeContext.Provider>
  );
}

/** One surface's theme in the current mode, WITHOUT CssBaseline — for an
 *  Od component shown inside the other surface's layout (e.g. the
 *  Backoffice's live customer preview), where a second CssBaseline would
 *  restyle the whole page. */
export function SurfaceThemeScope({
  surface,
  children,
}: {
  surface: ThemeSurface;
  children: React.ReactNode;
}) {
  const { mode } = useThemeMode();

  const theme = useMemo(() => THEME_BUILDERS[surface](mode), [surface, mode]);

  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}

/** Mounted by each surface's layout (Backoffice / Order-app): its theme
 *  plus CssBaseline. */
export function SurfaceThemeProvider({
  surface,
  children,
}: {
  surface: ThemeSurface;
  children: React.ReactNode;
}) {
  return (
    <SurfaceThemeScope surface={surface}>
      <CssBaseline />
      {children}
    </SurfaceThemeScope>
  );
}

/** The current light/dark mode and its toggle, for any component. */
export function useThemeMode() {
  const context = useContext(ThemeModeContext);
  if (!context) {
    throw new Error("useThemeMode must be used within a ThemeModeProvider");
  }
  return context;
}
