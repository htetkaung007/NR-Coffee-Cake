import {
  alpha,
  darken,
  type Theme,
  type ThemeOptions,
} from "@mui/material/styles";
import { inputLabelClasses } from "@mui/material/InputLabel";
import { outlinedInputClasses } from "@mui/material/OutlinedInput";

/** MenuCard's decorative colors — the storefront's "watercolor &
 *  scribbles / printed paper" look. Both themes define them: the Od
 *  theme with the storefront's colors, the Bo theme with calm values
 *  (no watercolor, money in text.primary) for the staff New Order page,
 *  so the one MenuCard follows whichever theme it renders under. */
export interface DecorPalette {
  /** Soft neutral blob behind the page and menu-card images. */
  wash: string;
  /** The second, colored blob on a menu-card image. */
  blob: string;
  /** Hand-drawn scribble line over menu-card images. */
  scribble: string;
  /** "Ink" outline + offset shadow on printed-style buttons. */
  ink: string;
  /** Muted warm text — the menu card's description. */
  mutedText: string;
  /** The menu card's price. */
  price: string;
}

declare module "@mui/material/styles" {
  // The form-field border — stronger than `divider` (≥ 3:1 against both
  // background.paper and background.default, WCAG non-text contrast for
  // an input's boundary). Both getBoTheme and getOdTheme define it; the
  // shared input look below reads it.
  interface Palette {
    inputBorder: string;
    decor: DecorPalette;
    /** The success role as TEXT (money received, on Reports): a shade
     *  of success with ≥ 4.5:1 against background.paper AND
     *  background.default. Only the Bo theme defines it. */
    successText?: string;
  }
  interface PaletteOptions {
    inputBorder?: string;
    decor?: DecorPalette;
    successText?: string;
  }
}

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
const BREAKPOINTS = { sm: 600, md: 900, lg: 1200 };

// Gates `&:hover` styles to devices that actually have a real hover +
// precise pointer, so touch devices never get stuck showing a hover state
// after a tap.
export const hoverCapableMedia = "@media (hover: hover) and (pointer: fine)";

/** Text only a screen reader gets — a spoken equivalent of something shown
 *  as a symbol or a chart (DESIGN.md Rule 22). Still takes part in layout
 *  as a 1px box, so it never causes a scroll. */
export const visuallyHiddenSx = {
  border: 0,
  clip: "rect(0 0 0 0)",
  height: "1px",
  margin: "-1px",
  overflow: "hidden",
  padding: 0,
  position: "absolute",
  whiteSpace: "nowrap",
  width: "1px",
} as const;

/** The Backoffice's fixed top bar's height at the current breakpoint
 *  (from sm up — the only range any sticky/fixed content below it
 *  needs to clear), read from the theme's own toolbar mixin rather
 *  than a hardcoded number. Shared by every sticky panel/header that
 *  positions itself just below the fixed AppBar (BillPanel, the Order
 *  History page's sticky header). */
export function topBarHeight(theme: Theme) {
  const fromSm = theme.mixins.toolbar[theme.breakpoints.up("sm")] as {
    minHeight: number;
  };
  return fromSm.minHeight;
}

/** THE gap between the Backoffice's top bar and a page's first line (its
 *  title): 16px on phones, 24px from sm. BackofficeShell's <main> is the
 *  only thing that applies it — pages and the layout add no top padding
 *  of their own, so every page title starts at the same height. A sticky
 *  header that is a page's first block (StickyPageHeader) pulls itself up
 *  by the same amount and pads it back, so it keeps that gap when stuck. */
export const backofficePageTop = { xs: 2, sm: 3 } as const;

const FONT_BODY = "var(--font-english), var(--font-myanmar), sans-serif";

const FONT_DISPLAY =
  "var(--font-display), var(--font-myanmar-serif), serif";

const BORDER_RADIUS = 8;

// Every input state rule below skips these, so hover never paints over
// the focused / error / disabled look.
const inputIsIdle = `:not(.${outlinedInputClasses.focused}):not(.${outlinedInputClasses.error}):not(.${outlinedInputClasses.disabled})`;

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
      // Playfair's default old-style figures make "Table 1" read as
      // "Table ı" and "#A024" sit low — use its lining figures.
      fontVariantNumeric: "lining-nums",
      fontWeight: 800,
      fontSize: "2rem",
      lineHeight: 1.3,

      [`@media (min-width:${BREAKPOINTS.md}px)`]: {
        fontSize: "2.5rem",
      },
    },

    h2: {
      fontFamily: FONT_DISPLAY,
      // Playfair's default old-style figures make "Table 1" read as
      // "Table ı" and "#A024" sit low — use its lining figures.
      fontVariantNumeric: "lining-nums",
      fontWeight: 800,
      fontSize: "1.6rem",
      lineHeight: 1.35,

      [`@media (min-width:${BREAKPOINTS.md}px)`]: {
        fontSize: "2rem",
      },
    },

    // Big figures — the order detail page's bill total. Body font (the
    // display serif reads poorly for numbers); same size at every width.
    h5: {
      fontFamily: FONT_BODY,
      fontWeight: 800,
      fontSize: "1.5rem",
      lineHeight: 1.3,
    },

    // Page/panel titles — the sans counterpart of h6 (bold, FONT_BODY),
    // e.g. the Order History page's title.
    subtitle1: {
      fontFamily: FONT_BODY,
      fontWeight: 700,
      fontSize: "1.05rem",
      lineHeight: 1.4,

      [`@media (min-width:${BREAKPOINTS.md}px)`]: {
        fontSize: "1.2rem",
      },
    },

    // Section headings
    h6: {
      fontFamily: FONT_DISPLAY,
      // Playfair's default old-style figures make "Table 1" read as
      // "Table ı" and "#A024" sit low — use its lining figures.
      fontVariantNumeric: "lining-nums",
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

    // Field labels / helper text / secondary lines (dates, add-on
    // summaries) — regular weight, so secondary text never reads bold.
    body2: {
      fontFamily: FONT_BODY,
      fontWeight: 400,
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
    // and price on mobile (MenuCard).
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
      variants: [
        {
          // A filled success button (Order List "Paid", the Mark-as-paid
          // dialog's confirm): success.main is too light for any text on
          // it (white 2.5:1), so it fills with palette.successText — the
          // success role's text shade — instead, with whichever text
          // reads on it (light: white 5.5:1; dark: near-black 7.3:1) and
          // a slightly darker hover. Only where the theme defines
          // successText (the Backoffice's); success.main itself is
          // unchanged for chips and badges.
          props: { variant: "contained", color: "success" },
          style: ({ theme }) => {
            const fill = theme.palette.successText;
            if (!fill) return {};
            // MUI paints contained buttons from these two variables; the
            // disabled look is untouched. MUI's own hover (success.dark)
            // is cancelled, ours is gated so it never sticks on touch
            // (DESIGN.md Rule 7).
            return {
              "--variant-containedBg": fill,
              "--variant-containedColor": theme.palette.getContrastText(fill),
              "@media (hover: hover)": {
                "&:hover": { "--variant-containedBg": fill },
              },
              [hoverCapableMedia]: {
                "&:hover": { "--variant-containedBg": darken(fill, 0.15) },
              },
            };
          },
        },
      ],
    },

    MuiTextField: {
      defaultProps: {
        fullWidth: true,
      },
    },

    // ── The one input look for the whole app (Backoffice + storefront) ──
    // Components must not restyle inputs (fill, border, radius, padding,
    // font) — only layout props (width, margins, size). See CLAUDE.md
    // Rule 10.
    MuiInputBase: {
      styleOverrides: {
        root: {
          fontFamily: FONT_BODY,
        },
        input: ({ theme }) => ({
          "&::placeholder": {
            color: theme.palette.text.secondary,
            opacity: 1,
          },
        }),
      },
    },

    MuiOutlinedInput: {
      styleOverrides: {
        root: ({ theme }) => ({
          backgroundColor: theme.palette.background.paper,
          borderRadius: BORDER_RADIUS,
          [`& .${outlinedInputClasses.notchedOutline}`]: {
            borderColor: theme.palette.inputBorder,
            borderWidth: 1,
          },
          // MUI darkens the border on any :hover (only undone for
          // `hover: none`) — reset it, then darken only where hover is real.
          [`&:hover${inputIsIdle} .${outlinedInputClasses.notchedOutline}`]: {
            borderColor: theme.palette.inputBorder,
          },
          [hoverCapableMedia]: {
            [`&:hover${inputIsIdle} .${outlinedInputClasses.notchedOutline}`]: {
              borderColor: alpha(theme.palette.text.primary, 0.7),
            },
          },
          // Focus always uses primary (whatever the `color` prop), 2px, on
          // the notched outline so the floating label's notch still works.
          [`&.${outlinedInputClasses.focused} .${outlinedInputClasses.notchedOutline}`]:
            {
              borderColor: theme.palette.primary.main,
              borderWidth: 2,
            },
          [`&.${outlinedInputClasses.error} .${outlinedInputClasses.notchedOutline}`]:
            {
              borderColor: theme.palette.error.main,
            },
          [`&.${outlinedInputClasses.disabled}`]: {
            backgroundColor: alpha(theme.palette.text.primary, 0.04),
            color: theme.palette.text.disabled,
          },
          [`&.${outlinedInputClasses.disabled} .${outlinedInputClasses.notchedOutline}`]:
            {
              borderColor: theme.palette.action.disabled,
            },
          [`&.${outlinedInputClasses.adornedStart}`]: {
            paddingLeft: theme.spacing(1.5),
          },
          [`&.${outlinedInputClasses.adornedEnd}`]: {
            paddingRight: theme.spacing(1.5),
          },
          [`&.${outlinedInputClasses.multiline}`]: {
            padding: theme.spacing(2, 1.5),
          },
          [`&.${outlinedInputClasses.multiline}.${outlinedInputClasses.sizeSmall}`]:
            {
              padding: theme.spacing(1.5),
            },
        }),
        // 8px grid: 16px/12px (medium), 12px/12px (small — 47px tall,
        // over the 44px touch minimum; MUI's own small is 40px). Padding
        // sits on the input, except multiline (the root pads, the
        // textarea doesn't) and the adorned side (the root pads there).
        input: ({ theme }) => ({
          padding: theme.spacing(2, 1.5),
          [`.${outlinedInputClasses.sizeSmall} &`]: {
            padding: theme.spacing(1.5),
          },
          [`.${outlinedInputClasses.adornedStart} &`]: { paddingLeft: 0 },
          [`.${outlinedInputClasses.adornedEnd} &`]: { paddingRight: 0 },
          [`.${outlinedInputClasses.multiline} &`]: { padding: 0 },
          [`&.${outlinedInputClasses.disabled}`]: {
            WebkitTextFillColor: theme.palette.text.disabled,
          },
        }),
      },
    },

    MuiInputLabel: {
      styleOverrides: {
        root: {
          fontFamily: FONT_BODY,
        },
        // Lines the resting label up with the input text above (12px in,
        // 16px / 12px down); the shrunk label keeps MUI's -9px notch
        // offset. Nested so `shrink` wins over the resting transform.
        outlined: ({ theme }) => ({
          transform: `translate(${theme.spacing(1.5)}, ${theme.spacing(2)}) scale(1)`,
          [`&.${inputLabelClasses.sizeSmall}`]: {
            transform: `translate(${theme.spacing(1.5)}, ${theme.spacing(1.5)}) scale(1)`,
          },
          [`&.${inputLabelClasses.shrink}`]: {
            transform: `translate(${theme.spacing(1.5)}, -9px) scale(0.75)`,
          },
        }),
      },
    },
  },
};
