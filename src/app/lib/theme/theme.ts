import { createTheme, type PaletteMode } from "@mui/material/styles";

/**
 * Design file ရဲ့ color palette table ထဲက token တွေ — ဒီနေရာ တစ်ခုတည်းမှာပဲ
 * သိမ်းထား. Color ပြောင်းချင်ရင် နောင်တွင် ဒီ file ကိုပဲ ပြင်ရမယ်, component
 * တစ်ခုချင်းစီထဲ လိုက်ရှာစရာ မလိုတော့ဘူး.
 *
 * Typography က အလားတူပဲ — "phone မှာ ဘယ်လိုအရွယ်, desktop မှာ ဘယ်လိုအရွယ်"
 * ဆိုတာကို component တစ်ခုချင်းစီထဲ fontSize breakpoint object ကို လက်နှင့်
 * ထပ်ခါထပ်ခါ ရေးမနေတော့ဘဲ, ဒီနေရာမှာ တစ်ခါတည်း သတ်မှတ်ထား — Typography
 * ကို variant name (h6, body2, caption...) နဲ့ပဲ ခေါ်ရင် အလိုအလျောက်
 * breakpoint အလိုက် ပြောင်းသွားမယ်.
 */

// MUI ရဲ့ default breakpoints — theme.breakpoints.up("sm") နဲ့ တူညီအောင်
// hardcode ထားရတာက createTheme() ထဲက object literal အတွင်းမှာ
// `theme.breakpoints` ကို self-reference လုပ်လို့ မရလို့ပါ (circular).
const BREAKPOINTS = { sm: 600, md: 900, lg: 1200 };

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
    typography: {
      // Section headings — e.g. "Menu Item Details" form title
      h6: {
        fontWeight: 800,
        fontSize: "1.1rem",
        [`@media (min-width:${BREAKPOINTS.md}px)`]: { fontSize: "1.25rem" },
      },
      // Card titles, price text — the main readable content size
      body1: {
        fontWeight: 700,
        fontSize: "0.8rem",
        [`@media (min-width:${BREAKPOINTS.sm}px)`]: { fontSize: "0.9rem" },
        [`@media (min-width:${BREAKPOINTS.md}px)`]: { fontSize: "0.95rem" },
      },
      // Field labels, form helper text
      body2: {
        fontWeight: 700,
        fontSize: "0.75rem",
        [`@media (min-width:${BREAKPOINTS.sm}px)`]: { fontSize: "0.85rem" },
      },
      // Category chips, small badges
      caption: {
        fontWeight: 700,
        fontSize: "0.6rem",
        [`@media (min-width:${BREAKPOINTS.sm}px)`]: { fontSize: "0.65rem" },
      },
      button: {
        textTransform: "none",
        fontWeight: 700,
      },
    },
  });
}
