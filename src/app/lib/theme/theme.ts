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
      background: {
        default: isLight ? "#FFFFFF" : "#121212", // Secondary Background
        paper: isLight ? "#F7F7F7" : "#1E1E1E", // Main Background (card/drawer/appbar)
      },
      text: {
        primary: isLight ? "#1F272D" : "#F5F5F5", // Main Text Color
      },
      divider: isLight ? "#E5E7EB" : "#333333", // Border / Line Color
    },
    ...sharedThemeOptions,
  });
}
