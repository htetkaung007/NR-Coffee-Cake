import { Box, Typography } from "@mui/material";
import { LocationService } from "@/app/services";
import { getSessionContext } from "@/app/lib/session";
import EditLocation from "./editLocation";

export default async function EditLocationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const locationId = Number(id);

  const { role } = await getSessionContext();
  if (role !== "ADMIN") {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="text.secondary">
          Only Admins can manage locations.
        </Typography>
      </Box>
    );
  }

  const location = await LocationService.getLocationById(locationId);
  if (!location) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="text.secondary">Location not found.</Typography>
      </Box>
    );
  }

  const daysUntilDeletable = LocationService.getDaysUntilDeletable(
    location.archivedAt,
  );

  return (
    <EditLocation
      location={{
        id: location.id,
        name: location.name,
        isArchived: location.isArchived,
        archivedAt: location.archivedAt?.toISOString() ?? null,
      }}
      daysUntilDeletable={daysUntilDeletable}
    />
  );
}
