import { redirect } from "next/navigation";
import { Box, Typography } from "@mui/material";
import { LocationService } from "@/app/services";
import { getSessionContext } from "@/app/lib/access/session";

/** A plain message in place of a printout ("This bill was not found."). */
export function PrintMessage({ children }: { children: React.ReactNode }) {
  return (
    <Box sx={{ p: 3 }}>
      <Typography color="text.secondary">{children}</Typography>
    </Box>
  );
}

/** Where a bill printout reads from: the session's company and selected
 *  location. No session → sign-in; no selected location → `fallback`,
 *  the message to render instead. */
export async function getPrintContext(): Promise<
  | { companyId: number; locationId: number; fallback?: undefined }
  | { fallback: React.ReactElement }
> {
  const { companyId, userId } = await getSessionContext();
  if (!companyId || !userId) redirect("/auth/signIn");

  const selectedLocation = await LocationService.getSelectedLocation(
    userId,
    companyId,
  );
  if (!selectedLocation) {
    return {
      fallback: (
        <PrintMessage>
          No location selected. Please choose a location first.
        </PrintMessage>
      ),
    };
  }
  return { companyId, locationId: selectedLocation.locationId };
}
