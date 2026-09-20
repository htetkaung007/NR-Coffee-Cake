import { SurfaceThemeProvider } from "@/app/lib/theme/ThemeModeProvider";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SurfaceThemeProvider surface="bo">{children}</SurfaceThemeProvider>;
}
