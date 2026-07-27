import { createTheme, type PaletteMode } from "@mui/material/styles";

/**
 * Design file ရဲ့ color palette table ထဲက token တွေ — ဒီနေရာ တစ်ခုတည်းမှာပဲ
 * သိမ်းထား. Color ပြောင်းချင်ရင် နောင်တွင် ဒီ file ကိုပဲ ပြင်ရမယ်, component
 * တစ်ခုချင်းစီထဲ လိုက်ရှာစရာ မလိုတော့ဘူး.
 */
export function getTheme(mode: PaletteMode) {
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
        default: isLight ? "#F7F7F7" : "#121212", // Secondary Background
        paper: isLight ? "#FFFFFF" : "#1E1E1E", // Main Background (card/drawer/appbar)
      },
      text: {
        primary: isLight ? "#1F272D" : "#F5F5F5", // Main Text Color
      },
      divider: isLight ? "#E5E7EB" : "#333333", // Border / Line Color
    },
    shape: {
      borderRadius: 8,
    },
  });
}
