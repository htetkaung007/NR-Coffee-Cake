import type { ThemeOptions } from "@mui/material/styles";

/**
 * Backoffice (Bo) နဲ့ Order-app (Od) theme နှစ်ခုလုံးက ဒီ file ကို import လုပ်ပြီး
 * သုံးတယ် — font, typography scale, shape, component override တွေက surface
 * နှစ်ခုမှာ မကွဲပြားရ. Font ပြောင်းချင်ရင် ဒီ file တစ်ခုတည်းကိုပဲ ပြင်ရမယ်.
 * Color (palette) ကိုတော့ ဒီမှာ မထည့်ဘူး — theme.ts (Bo) / odTheme.ts (Od)
 * ထဲမှာ ခွဲထားတယ်.
 *
 * Typography က "phone မှာ ဘယ်လိုအရွယ်, desktop မှာ ဘယ်လိုအရွယ်" ဆိုတာကို
 * component တစ်ခုချင်းစီထဲ fontSize breakpoint object ကို လက်နှင့်
 * ထပ်ခါထပ်ခါ ရေးမနေတော့ဘဲ, ဒီနေရာမှာ တစ်ခါတည်း သတ်မှတ်ထား — Typography
 * ကို variant name (h6, body2, caption...) နဲ့ပဲ ခေါ်ရင် အလိုအလျောက်
 * breakpoint အလိုက် ပြောင်းသွားမယ်.
 */

// MUI ရဲ့ default breakpoints — theme.breakpoints.up("sm") နဲ့ တူညီအောင်
// hardcode ထားရတာက createTheme() ထဲက object literal အတွင်းမှာ
// `theme.breakpoints` ကို self-reference လုပ်လို့ မရလို့ပါ (circular).
export const BREAKPOINTS = { sm: 600, md: 900, lg: 1200 };

// Gates `&:hover` styles to devices that actually have a real hover +
// precise pointer, so touch devices never get stuck showing a hover state
// after a tap.
export const hoverCapableMedia = "@media (hover: hover) and (pointer: fine)";

export const FONT_BODY = "var(--font-english), var(--font-myanmar), sans-serif";

export const FONT_DISPLAY =
  "var(--font-display), var(--font-myanmar-serif), serif";

const BORDER_RADIUS = 8;

/** `createTheme({ palette, ...sharedThemeOptions })` ပုံစံနဲ့ spread လုပ်ပြီး သုံးရန် */
export const sharedThemeOptions: ThemeOptions = {
  shape: {
    borderRadius: BORDER_RADIUS,
  },
  typography: {
    // Section headings — e.g. "Menu Item Details" form title
    fontFamily: FONT_BODY,

    h1: {
      fontFamily: FONT_DISPLAY,
      fontWeight: 800,
      fontSize: "2rem",
      lineHeight: 1.3,

      [`@media (min-width:${BREAKPOINTS.md}px)`]: {
        fontSize: "2.5rem",
      },
    },

    h2: {
      fontFamily: FONT_DISPLAY,
      fontWeight: 800,
      fontSize: "1.6rem",
      lineHeight: 1.35,

      [`@media (min-width:${BREAKPOINTS.md}px)`]: {
        fontSize: "2rem",
      },
    },

    // Section headings
    h6: {
      fontFamily: FONT_DISPLAY,
      fontWeight: 800,
      fontSize: "1.1rem",
      lineHeight: 1.4,

      [`@media (min-width:${BREAKPOINTS.md}px)`]: {
        fontSize: "1.25rem",
      },
    },

    // Card title / main readable text
    body1: {
      fontFamily: FONT_BODY,
      fontWeight: 600,
      fontSize: "0.9rem",
      lineHeight: 1.75,

      [`@media (min-width:${BREAKPOINTS.sm}px)`]: {
        fontSize: "0.95rem",
      },

      [`@media (min-width:${BREAKPOINTS.md}px)`]: {
        fontSize: "1rem",
      },
    },

    // Field labels / helper text
    body2: {
      fontFamily: FONT_BODY,
      fontWeight: 600,
      fontSize: "0.75rem",
      lineHeight: 1.7,

      [`@media (min-width:${BREAKPOINTS.sm}px)`]: {
        fontSize: "0.85rem",
      },
    },

    // Chips / small labels
    caption: {
      fontFamily: FONT_BODY,
      fontWeight: 700,
      fontSize: "0.6rem",
      lineHeight: 1.5,

      [`@media (min-width:${BREAKPOINTS.sm}px)`]: {
        fontSize: "0.65rem",
      },
    },

    // Compact emphasized text — 14px / 600. Used by the menu card's name
    // and price on mobile (OdMenuCard).
    subtitle2: {
      fontFamily: FONT_BODY,
      fontWeight: 600,
      fontSize: "0.875rem",
      lineHeight: 1.4,
    },

    button: {
      fontFamily: FONT_BODY,
      textTransform: "none",
      fontWeight: 700,
      fontSize: "0.85rem",

      [`@media (min-width:${BREAKPOINTS.sm}px)`]: {
        fontSize: "0.9rem",
      },
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          fontFamily: FONT_BODY,
          textTransform: "none",
          fontWeight: 700,
          borderRadius: BORDER_RADIUS,
        },
      },
    },

    MuiTextField: {
      defaultProps: {
        fullWidth: true,
      },
    },

    MuiInputBase: {
      styleOverrides: {
        root: {
          fontFamily: FONT_BODY,
        },
      },
    },

    MuiInputLabel: {
      styleOverrides: {
        root: {
          fontFamily: FONT_BODY,
        },
      },
    },
  },
};
