import { createTheme, type PaletteMode } from "@mui/material/styles";
import { sharedThemeOptions } from "./sharedThemeTokens";

/** Decorative colors for the storefront's "watercolor & scribbles /
 *  printed paper" look — they don't play a primary/secondary/background/
 *  text role, so they get their own palette key instead of being
 *  hardcoded in components. */
export interface DecorPalette {
  /** Soft neutral blob behind the page and menu-card images. */
  wash: string;
  /** Hand-drawn scribble line over menu-card images. */
  scribble: string;
  /** "Ink" outline + offset shadow on printed-style buttons. */
  ink: string;
  /** Muted warm text — the menu card's description on mobile; softer
   *  than the neutral grey text.secondary. */
  mutedText: string;
}

declare module "@mui/material/styles" {
  // Only getOdTheme defines this — components reading palette.decor must
  // render under the Od theme (see SurfaceThemeScope), never the Bo one.
  interface Palette {
    decor: DecorPalette;
  }
  interface PaletteOptions {
    decor?: DecorPalette;
  }
}

/**
 * Order-app (Od) theme — customer-facing storefront. Warm terracotta / cream
 * palette (appetite appeal). Customer-facing components read every color from
 * here via useTheme() / sx tokens — no hex and no globals.css variables in
 * components.
 *
 * Font / typography / shape က Bo theme နဲ့ ဘုံဖြစ်လို့ sharedThemeTokens.ts
 * မှာပဲ ရှိတယ် — ဒီ file မှာ palette ပဲ ရှိရမယ်.
 */
export function getOdTheme(mode: PaletteMode) {
  const isLight = mode === "light";

  return createTheme({
    palette: {
      mode,
      primary: {
        main: isLight ? "#C75A3C" : "#E8825E", // Terracotta — main action color
        dark: isLight ? "#A9432F" : "#D97652", // Hover
        contrastText: isLight ? "#FFF9ED" : "#2D1B10",
      },
      secondary: {
        main: "#D2A172", // Caramel accent
        contrastText: "#2D1B10",
      },
      success: {
        main: "#10B981", // Free Badge Background (Bo နဲ့ တူ)
      },
      error: {
        // Red — menu prices, out-of-stock, addon prices, cart badge.
        main: isLight ? "#C62828" : "#EF5350",
      },
      background: {
        default: isLight ? "#FAF7F2" : "#1A1512", // Brand cream
        paper: isLight ? "#FFFFFF" : "#241D18",
      },
      text: {
        primary: isLight ? "#2D1B10" : "#F5EFE6", // Espresso
      },
      divider: isLight ? "#E6DCCF" : "#3A2F27",
      decor: {
        wash: isLight ? "#D7CCC8" : "#3A2F27",
        scribble: isLight ? "#8D6E63" : "#B79C90",
        ink: isLight ? "#59402F" : "#120D0A",
        mutedText: isLight ? "#7D6E62" : "#B8A99C",
      },
    },
    ...sharedThemeOptions,
  });
}
