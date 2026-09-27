import { alpha, createTheme, type PaletteMode } from "@mui/material/styles";
import { sharedThemeOptions } from "./sharedThemeTokens";

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
  const textPrimary = isLight ? "#2D1B10" : "#F5EFE6"; // Espresso
  const caramel = "#D2A172";
  // Red — menu prices, out-of-stock, addon prices, cart badge.
  const red = isLight ? "#C62828" : "#EF5350";

  return createTheme({
    palette: {
      mode,
      primary: {
        main: isLight ? "#C75A3C" : "#E8825E", // Terracotta — main action color
        dark: isLight ? "#A9432F" : "#D97652", // Hover
        contrastText: isLight ? "#FFF9ED" : "#2D1B10",
      },
      secondary: {
        main: caramel, // Caramel accent
        contrastText: "#2D1B10",
      },
      success: {
        main: "#10B981", // Free Badge Background (Bo နဲ့ တူ)
      },
      error: {
        main: red,
      },
      background: {
        default: isLight ? "#FAF7F2" : "#1A1512", // Brand cream
        paper: isLight ? "#FFFFFF" : "#241D18",
      },
      text: {
        primary: textPrimary,
      },
      divider: isLight ? "#E6DCCF" : "#3A2F27",
      // Form-field border (see sharedThemeTokens' Palette.inputBorder) — a
      // warm espresso tint rather than the terracotta primary, which reads
      // as an error/alert color on an idle field. ≥ 3:1 on paper and on
      // default in both modes (light 3.8:1 / 3.7:1, dark 5.3:1 / 5.5:1).
      inputBorder: alpha(textPrimary, 0.55),
      decor: {
        wash: isLight ? "#D7CCC8" : "#3A2F27",
        scribble: isLight ? "#8D6E63" : "#B79C90",
        ink: isLight ? "#59402F" : "#120D0A",
        mutedText: isLight ? "#7D6E62" : "#B8A99C",
        // The storefront's look: a caramel blob, red prices.
        blob: caramel,
        price: red,
      },
    },
    ...sharedThemeOptions,
  });
}
