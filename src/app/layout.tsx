import {
  Playfair_Display,
  Noto_Serif_Myanmar,
  DM_Sans,
  Noto_Sans_Myanmar,
} from "next/font/google";
import { Providers } from "./components/Providers";
import "./globals.css";

// Self-hosted via next/font (downloaded at build time, no request to
// Google at runtime — faster and more private than a <link> tag).
// Each font is exposed as a CSS variable; theme.ts's fontFamily
// strings reference these variable names directly, so this is the
// only place a font's actual source ever needs to change.
const displayFont = Playfair_Display({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

const myanmarSerifFont = Noto_Serif_Myanmar({
  subsets: ["myanmar"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-myanmar-serif",
  display: "swap",
});

const englishFont = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-english",
  display: "swap",
});

const myanmarFont = Noto_Sans_Myanmar({
  subsets: ["myanmar"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-myanmar",
  display: "swap",
});

// src/app/layout.tsx
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="my"
      className={`
        ${myanmarFont.variable}
        ${myanmarSerifFont.variable}
        ${englishFont.variable}
        ${displayFont.variable}
      `}
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
