import { getTranslations } from "next-intl/server";
import { Box, Typography } from "@mui/material";
import { LocationService, ManagerService } from "@/app/services";
import { requireBackofficeAccess } from "@/app/lib/access/backofficeContext";
import { config } from "@/app/utils/config";
import EditLocation from "./EditLocation";

export default async function EditLocationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const locationId = Number(id);

  const { scope, fallback } = await requireBackofficeAccess({
    access: "owner",
  });
  if (!scope) return fallback;

  const location = await LocationService.getLocationById(locationId);
  // Another company's location reads as not found.
  if (!location || location.companyId !== scope.companyId) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="text.secondary">
          {(await getTranslations("bo.locations"))("notFound")}
        </Typography>
      </Box>
    );
  }

  // Display only — the delete action checks the same rule again.
  const deletion = await LocationService.getDeletion(
    location.id,
    scope.companyId,
  );
  // Who blocks the delete, so the owner knows whom to move or remove.
  const blockingManagers =
    !deletion.allowed && deletion.reason === "hasManagers"
      ? (await ManagerService.listManagers(scope.companyId))
          .filter((manager) => manager.locationId === location.id)
          .map((manager) => ({
            id: manager.id,
            name: manager.name || manager.email,
          }))
      : [];

  return (
    <EditLocation
      location={{
        id: location.id,
        name: location.name,
        isArchived: location.isArchived,
        onlineMenuEnabled: location.onlineMenuEnabled,
      }}
      publicBaseUrl={config.publicBaseUrl}
      deletion={deletion}
      blockingManagers={blockingManagers}
    />
  );
}
