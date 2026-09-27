import { alpha, createTheme, type PaletteMode } from "@mui/material/styles";
import { sharedThemeOptions } from "./sharedThemeTokens";

/**
 * Backoffice (Bo) theme — design file ရဲ့ color palette table ထဲက token တွေ
 * ဒီနေရာမှာပဲ သိမ်းထား. Color ပြောင်းချင်ရင် ဒီ file ကိုပဲ ပြင်ရမယ်, component
 * တစ်ခုချင်းစီထဲ လိုက်ရှာစရာ မလိုဘူး.
 *
 * Font / typography / shape ကတော့ Od theme နဲ့ ဘုံဖြစ်လို့ sharedThemeTokens.ts
 * မှာ ရှိတယ်. Customer-facing order-app theme က odTheme.ts မှာ.
 */
export function getBoTheme(mode: PaletteMode) {
  const isLight = mode === "light";
  // Coffee brown / caramel — see primary below. The two border strengths
  // (divider, inputBorder) are derived from it, so they follow the brand.
  const primaryMain = isLight ? "#4A2E22" : "#D4A373";
  const textPrimary = isLight ? "#1F272D" : "#F5F5F5"; // Main Text Color
  const textSecondary = isLight
    ? "rgba(0, 0, 0, 0.6)"
    : "rgba(255, 255, 255, 0.7)";

  return createTheme({
    palette: {
      mode,
      primary: {
        // Accent & Buttons — coffee brown. light/dark are derived by MUI.
        // Dark mode swaps to a caramel: #4A2E22 on a dark background is
        // under 2:1. Caramel on the dark default is 8.2:1, and the dark
        // contrastText on it 8.0:1. Light: white on #4A2E22 is 12.3:1.
        main: primaryMain,
        contrastText: isLight ? "#FFFFFF" : "#1F1410",
      },
      success: {
        // Free Badge Background
        main: "#10B981",
      },
      // The roles below are written out with MUI v9's own defaults (all
      // four shades, so nothing is re-derived) — declared only so every
      // Backoffice color can be changed from this file.
      secondary: {
        // Counter accent (Order List source color)
        main: isLight ? "#9c27b0" : "#ce93d8",
        light: isLight ? "#ba68c8" : "#f3e5f5",
        dark: isLight ? "#7b1fa2" : "#ab47bc",
        contrastText: isLight ? "#fff" : "rgba(0, 0, 0, 0.87)",
      },
      warning: {
        // Needs-approval state — chips, pending cards and their tints, alert bar
        main: isLight ? "#ed6c02" : "#ffa726",
        light: isLight ? "#ff9800" : "#ffb74d",
        dark: isLight ? "#e65100" : "#f57c00",
        contrastText: isLight ? "#fff" : "rgba(0, 0, 0, 0.87)",
      },
      error: {
        // Destructive actions (Reject) and the Order List's pending dot/border
        main: isLight ? "#d32f2f" : "#f44336",
        light: isLight ? "#ef5350" : "#e57373",
        dark: isLight ? "#c62828" : "#d32f2f",
        contrastText: "#fff",
      },
      info: {
        // Table accent (Order List source color)
        main: isLight ? "#0288d1" : "#29b6f6",
        light: isLight ? "#03a9f4" : "#4fc3f7",
        dark: isLight ? "#01579b" : "#0288d1",
        contrastText: isLight ? "#fff" : "rgba(0, 0, 0, 0.87)",
      },
      background: {
        // Page background — warm off-white / warm near-black
        default: isLight ? "#FAF6F0" : "#17120F",
        // Cards, panels, drawer, app bar — white on the cream page
        paper: isLight ? "#FFFFFF" : "#211A16",
      },
      text: {
        primary: textPrimary,
        // Supporting text — times, sublines, captions, column headers
        secondary: textSecondary,
      },
      // MenuCard on the staff New Order page: no watercolor (transparent
      // wash / blob / scribble), the "+" outlined in primary, and money
      // in text.primary — never red (DESIGN.md Rule 13).
      decor: {
        wash: "transparent",
        blob: "transparent",
        scribble: "transparent",
        ink: primaryMain,
        mutedText: textSecondary,
        price: textPrimary,
      },
      // Two border strengths, both tints of primary:
      // divider — soft separators and card/list borders (~1.45:1 on
      // paper and on the page: visible on the cream, but calm).
      divider: alpha(primaryMain, 0.2),
      // inputBorder — form-field boundaries: ≥ 3:1 against both paper
      // and default in both modes (light 3.7:1 / 3.6:1, dark 3.6:1 / 3.7:1).
      inputBorder: alpha(primaryMain, 0.6),
    },
    ...sharedThemeOptions,
  });
}
