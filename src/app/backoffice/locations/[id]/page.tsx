import { Box, Typography } from "@mui/material";
import { LocationService } from "@/app/services";
import { requireBackofficeAccess } from "@/app/lib/backofficeContext";
import EditLocation from "./EditLocation";

export default async function EditLocationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const locationId = Number(id);

  const { scope, fallback } = await requireBackofficeAccess({
    signedOut: "Please sign in to manage locations.",
    access: "owner",
  });
  if (!scope) return fallback;

  const location = await LocationService.getLocationById(locationId);
  // Another company's location reads as not found.
  if (!location || location.companyId !== scope.companyId) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="text.secondary">Location not found.</Typography>
      </Box>
    );
  }

  // Display only — the delete action checks the same rule again.
  const deletion = await LocationService.getDeletion(
    location.id,
    scope.companyId,
  );

  return (
    <EditLocation
      location={{
        id: location.id,
        name: location.name,
        isArchived: location.isArchived,
      }}
      deletion={deletion}
    />
  );
}
