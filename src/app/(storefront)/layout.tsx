import { SurfaceThemeProvider } from "@/app/lib/theme/ThemeModeProvider";

export default function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SurfaceThemeProvider surface="od">{children}</SurfaceThemeProvider>;
}
