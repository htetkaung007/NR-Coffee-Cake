import { createTheme, type PaletteMode } from "@mui/material/styles";
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

  return createTheme({
    palette: {
      mode,
      primary: {
        // Accent & Buttons — design ထဲက main action color
        main: "#F14647",
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
        default: isLight ? "#FFFFFF" : "#121212", // Secondary Background
        paper: isLight ? "#F7F7F7" : "#1E1E1E", // Main Background (card/drawer/appbar)
      },
      text: {
        primary: isLight ? "#1F272D" : "#F5F5F5", // Main Text Color
        // Supporting text — times, sublines, captions, column headers
        secondary: isLight ? "rgba(0, 0, 0, 0.6)" : "rgba(255, 255, 255, 0.7)",
      },
      divider: isLight ? "#E5E7EB" : "#333333", // Border / Line Color
    },
    ...sharedThemeOptions,
  });
}
