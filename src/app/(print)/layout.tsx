import { SurfaceThemeProvider } from "@/app/lib/theme/ThemeModeProvider";

/** Printable pages — deliberately outside the Backoffice layout, so no
 *  sidebar, top bar, new-order banner or alert polling end up on paper.
 *  Only the Backoffice theme (typography, palette) — same as auth/. */
export default function PrintLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SurfaceThemeProvider surface="bo">{children}</SurfaceThemeProvider>;
}
