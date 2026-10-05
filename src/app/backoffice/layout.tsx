import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "../utils/config/authOptions";
import { BackofficeShell } from "../components/BackofficeShell";
import { AppService, LocationService } from "../services";
import { getSessionContext } from "../lib/session";
import { Box } from "@mui/material";
import { SurfaceThemeProvider } from "../lib/theme/ThemeModeProvider";
import { OrderAlertsProvider } from "./OrderAlertsProvider";
import NewOrderBanner from "./NewOrderBanner";

interface Props {
  children?: React.ReactNode;
}

export default async function BackOfficeLayout({ children }: Props) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) redirect("/auth/signIn");

  const company = await AppService.getCompanyByEmail(email);
  if (!company) redirect("/auth/signIn");
  const companyName = company.name;

  // The selected location's name for the top bar (null: none selected,
  // or it has been archived — the top bar then shows its fallbacks).
  const { userId, role } = await getSessionContext();
  const selectedLocation = userId
    ? await LocationService.getSelectedLocation(userId)
    : null;
  const locationName = selectedLocation
    ? await LocationService.getShopNameForLocation(selectedLocation.locationId)
    : null;

  return (
    <SurfaceThemeProvider surface="bo">
      {/* Wraps the whole shell (not just the page) so it stays mounted
          across Backoffice navigation and the top/side bars can read it. */}
      <OrderAlertsProvider>
        <Box>
          <BackofficeShell
            companyName={companyName}
            locationName={locationName}
            role={role}
          >
            <NewOrderBanner />
            <Box sx={{ display: "flex", minHeight: "calc(100vh - 64px)" }}>
              <Box
                sx={{
                  // The page surface — cards/panels on it use
                  // background.paper (see getBoTheme's background roles).
                  // Phones get no card at all (no fill, corners or
                  // padding) — BackofficeShell's 12px gutter is the only
                  // horizontal padding there.
                  bgcolor: { xs: "transparent", sm: "background.default" },
                  width: "100%",
                  // No top padding: BackofficeShell's backofficePageTop
                  // is the only gap above a page's title.
                  px: { xs: 0, sm: 0, md: 3 },
                  pb: { xs: 0, sm: 0, md: 3 },
                  borderRadius: { xs: 0, sm: 3 },
                }}
              >
                {children}
              </Box>
            </Box>
          </BackofficeShell>
        </Box>
      </OrderAlertsProvider>
    </SurfaceThemeProvider>
  );
}
