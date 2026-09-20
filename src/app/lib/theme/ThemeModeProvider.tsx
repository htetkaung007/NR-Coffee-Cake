"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
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

// Server Component layout ကနေ function ကို Client Component ဆီ prop အနေနဲ့
// ပို့လို့ မရလို့ (serialize မလုပ်နိုင်) string key နဲ့ပဲ ပို့ပြီး ဒီမှာ resolve လုပ်တယ်.
const THEME_BUILDERS = {
  bo: getBoTheme,
  od: getOdTheme,
} as const;

export type ThemeSurface = keyof typeof THEME_BUILDERS;

/** Light/dark mode state + toggle ကိုပဲ ကိုင်တယ် (app တစ်ခုလုံးမှာ တစ်ခုတည်း, root layout ကနေ mount).
 *  Theme object ကိုတော့ SurfaceThemeProvider က surface အလိုက် ဆောက်တယ်. */
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

/** Surface တစ်ခုရဲ့ theme ကိုပဲ (CssBaseline မပါဘဲ) လက်ရှိ mode နဲ့ ဆောက်ပေးတယ်.
 *  တခြား surface ရဲ့ layout ထဲမှာ Od component ကို ထည့်ပြရတဲ့ နေရာ (ဥပမာ backoffice
 *  ရဲ့ live customer preview) အတွက် — CssBaseline က page တစ်ခုလုံးကို ထပ်ခြယ်မှာမို့
 *  ဒီမှာ မထည့်ဘူး. */
export function SurfaceThemeScope({
  surface,
  children,
}: {
  surface: ThemeSurface;
  children: React.ReactNode;
}) {
  const { mode } = useThemeMode();

  // Mode ပြောင်းတိုင်း theme object အသစ် ပြန်မတည်ဆောက်စေရန် memoize
  const theme = useMemo(() => THEME_BUILDERS[surface](mode), [surface, mode]);

  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}

/** Surface (Backoffice / Order-app) တစ်ခုချင်းစီရဲ့ layout ကနေ mount လုပ်ပြီး
 *  theme + CssBaseline ကို ပေးတယ်. */
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

/** Component ဘယ်ဟာကမဆို "အခု light လား dark လား" သိချင်ရင် / toggle ချင်ရင် သုံးရန် */
export function useThemeMode() {
  const context = useContext(ThemeModeContext);
  if (!context) {
    throw new Error("useThemeMode must be used within a ThemeModeProvider");
  }
  return context;
}
