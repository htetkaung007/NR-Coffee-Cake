import { createTheme, type PaletteMode } from "@mui/material/styles";
import { sharedThemeOptions } from "./sharedThemeTokens";

/**
 * Order-app (Od) theme — customer-facing storefront. Warm terracotta / cream
 * palette (appetite appeal), globals.css ထဲက --color-brand-* နဲ့ OdMenuCard ရဲ့
 * button အရောင်တွေနဲ့ ကိုက်အောင် ရွေးထား.
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
        dark: "#A9432F", // Hover
        contrastText: isLight ? "#FFF9ED" : "#2D1B10",
      },
      secondary: {
        main: "#D2A172", // Caramel accent
        contrastText: "#2D1B10",
      },
      success: {
        main: "#10B981", // Free Badge Background (Bo နဲ့ တူ)
      },
      background: {
        default: isLight ? "#FAF7F2" : "#1A1512", // Brand cream
        paper: isLight ? "#FFFFFF" : "#241D18",
      },
      text: {
        primary: isLight ? "#2D1B10" : "#F5EFE6", // Espresso
      },
      divider: isLight ? "#E6DCCF" : "#3A2F27",
    },
    ...sharedThemeOptions,
  });
}
