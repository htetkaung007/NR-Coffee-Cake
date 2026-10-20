import { SurfaceThemeProvider } from "@/app/lib/theme/ThemeModeProvider";
import StaffIntlProvider from "@/app/components/StaffIntlProvider";

/** Sign in / sign up: the Backoffice theme and the staff's language —
 *  this device's BO_LOCALE (English until someone picks Myanmar in the
 *  Backoffice's account menu; there's no switch on these pages). */

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SurfaceThemeProvider surface="bo">
      <StaffIntlProvider>{children}</StaffIntlProvider>
    </SurfaceThemeProvider>
  );
}
