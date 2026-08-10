import { Box, Typography } from "@mui/material";
import { LocationService } from "@/app/services";
import { getSessionContext } from "@/app/lib/session";
import AddManagerForm from "./addManager";

export default async function SettingsPage() {
  const { companyId, role } = await getSessionContext();

  if (!companyId) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="text.secondary">
          Please sign in to view settings.
        </Typography>
      </Box>
    );
  }

  if (role !== "ADMIN") {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="text.secondary">
          Only Admins can access Settings.
        </Typography>
      </Box>
    );
  }

  const locations = await LocationService.getActiveLocations(companyId);

  return <AddManagerForm locations={locations} />;
}
